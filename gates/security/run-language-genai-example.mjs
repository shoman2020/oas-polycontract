import { spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const scannerVersion = process.env.SEMGREP_VERSION;
if (!scannerVersion) throw new Error('Set SEMGREP_VERSION from .github/versions.env before running this example.');

const examples = [
  {
    language: 'rust',
    filename: 'chat.rs',
    rule: 'genai-untrusted-system-prompt-rust',
    source: `pub struct ChatRequest { pub prompt: String }
pub struct ChatMessage;

impl ChatMessage {
    pub fn system(_content: String) -> Self { Self }
}

pub fn build_system_message(request: ChatRequest) -> ChatMessage {
    ChatMessage::system(request.prompt)
}
`,
  },
  {
    language: 'go',
    filename: 'chat.go',
    rule: 'genai-untrusted-system-prompt-go',
    source: `package example

type ChatRequest struct { Prompt string }
type ChatMessage struct { Role string; Content string }

func SystemMessage(content string) ChatMessage {
    return ChatMessage{Role: "system", Content: content}
}

func buildSystemMessage(request ChatRequest) ChatMessage {
    return SystemMessage(request.Prompt)
}
`,
  },
  {
    language: 'java',
    filename: 'Chat.java',
    rule: 'genai-untrusted-system-prompt-java',
    source: `record ChatRequest(String prompt) {}
record ChatMessage(String role, String content) {
    static ChatMessage system(String content) {
        return new ChatMessage("system", content);
    }
}

final class ChatHandler {
    ChatMessage buildSystemMessage(ChatRequest request) {
        return ChatMessage.system(request.prompt());
    }
}
`,
  },
  {
    language: 'csharp',
    filename: 'Chat.cs',
    rule: 'genai-untrusted-system-prompt-csharp',
    source: `public sealed record ChatRequest(string Prompt);
public sealed record ChatMessage(string Role, string Content)
{
    public static ChatMessage System(string content) => new("system", content);
}

public static class ChatHandler
{
    public static ChatMessage BuildSystemMessage(ChatRequest request) =>
        ChatMessage.System(request.Prompt);
}
`,
  },
];

const fixtureRoot = mkdtempSync(join(tmpdir(), 'oas-polycontract-semgrep-'));
const fixtureDirectory = join(fixtureRoot, 'fixtures');
const reportDirectory = join(fixtureRoot, 'report');
const reportPath = resolve(
  process.env.SEMGREP_GENAI_REPORT ?? join(fixtureRoot, 'language-genai.sarif'),
);

function verifyReport(sarif) {
  const findings = sarif.runs.flatMap((run) => (run.results ?? []).map((result) => ({
    ruleId: result.ruleId,
    uri: result.locations?.[0]?.physicalLocation?.artifactLocation?.uri?.replaceAll('\\', '/') ?? '',
    line: result.locations?.[0]?.physicalLocation?.region?.startLine,
  })));

  for (const example of examples) {
    const suffix = `/fixtures/${example.language}/${example.filename}`;
    const matches = findings.filter(({ ruleId, uri }) => ruleId === example.rule && uri.endsWith(suffix));
    if (matches.length !== 1) {
      throw new Error(`Expected one ${example.rule} finding in ${suffix}; found ${matches.length}.`);
    }
    console.log(`Detected ${example.rule} at ${basename(example.filename)}:${matches[0].line ?? '?'}`);
  }

  if (findings.length !== examples.length) {
    throw new Error(`Expected ${examples.length} total findings; Semgrep reported ${findings.length}.`);
  }
  return findings;
}

let failure;
try {
  mkdirSync(fixtureDirectory, { recursive: true });
  mkdirSync(reportDirectory, { recursive: true });
  for (const example of examples) {
    const directory = join(fixtureDirectory, example.language);
    mkdirSync(directory, { recursive: true });
    writeFileSync(join(directory, example.filename), example.source, 'utf8');
  }

  // The pinned scanner runs unprivileged and needs write access only to the temporary report folder.
  if (process.platform !== 'win32') chmodSync(reportDirectory, 0o777);
  const reportInContainer = '/report/language-genai.sarif';
  const scan = spawnSync('docker', [
    'run', '--rm',
    '--mount', `type=bind,source=${fixtureDirectory},target=/fixtures,readonly`,
    '--mount', `type=bind,source=${resolve(repositoryRoot, 'gates/security/semgrep-genai.yml')},target=/rules/semgrep-genai.yml,readonly`,
    '--mount', `type=bind,source=${reportDirectory},target=/report`,
    `semgrep/semgrep:${scannerVersion}`,
    'semgrep', 'scan',
    '--config', '/rules/semgrep-genai.yml',
    '--metrics=off',
    '--sarif', '--output', reportInContainer,
    '/fixtures',
  ], { cwd: repositoryRoot, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });

  if (scan.stdout) process.stdout.write(scan.stdout);
  if (scan.stderr) process.stderr.write(scan.stderr);
  if (scan.error) throw scan.error;
  if (scan.status !== 0) throw new Error(`Semgrep scan failed with exit code ${scan.status}.`);
  const localReportPath = join(reportDirectory, 'language-genai.sarif');
  if (!existsSync(localReportPath)) throw new Error('Semgrep did not create the expected SARIF report.');

  const findings = verifyReport(JSON.parse(readFileSync(localReportPath, 'utf8')));
  if (process.env.SEMGREP_GENAI_REPORT) {
    mkdirSync(dirname(reportPath), { recursive: true });
    copyFileSync(localReportPath, reportPath);
  }

  const title = 'Semgrep language-specific GenAI examples: 4/4 detected';
  const detail = `Semgrep ${scannerVersion} detected untrusted request input flowing into system-message sinks in Rust, Go, Java, and C#. The SARIF report contains ${findings.length} findings.`;
  console.log(`${title}\n${detail}`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    writeFileSync(process.env.GITHUB_STEP_SUMMARY, `## ${title}\n\n${detail}\n`, { flag: 'a' });
  }
} catch (error) {
  failure = error;
} finally {
  rmSync(fixtureRoot, { recursive: true, force: true });
}

if (failure) throw failure;
