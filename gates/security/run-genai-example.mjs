import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const scannerVersion = process.env.SECUREAI_SCAN_VERSION;
if (!scannerVersion) {
  throw new Error('Set SECUREAI_SCAN_VERSION from .github/versions.env before running this example.');
}

const demoRoot = mkdtempSync(join(tmpdir(), 'secureai-genai-example-'));
const sourcePath = join(demoRoot, 'src', 'chat.ts');
const reportPath = resolve(
  process.env.SECUREAI_DEMO_REPORT ?? join(demoRoot, 'secureai-genai-example.sarif'),
);

const vulnerableExample = `import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function answer(request: { body: { prompt: string } }) {
  const userPrompt = request.body.prompt;
  const systemPrompt = 'Answer the user. ' + userPrompt;

  return client.chat.completions.create({
    model: 'gpt-4.1',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });
}
`;

function summarizeResult(sarif, demoFolder) {
  const results = sarif.runs.flatMap((run) =>
    (run.results ?? []).map((result) => ({
      result,
      rule: run.tool.driver.rules?.find((rule) => rule.id === result.ruleId),
    })),
  );
  const finding = results.find(({ result }) => {
    const uri = result.locations?.[0]?.physicalLocation?.artifactLocation?.uri?.replaceAll('\\', '/');
    return result.ruleId === 'AI001' && (uri?.endsWith(`${demoFolder}/src/chat.ts`) || uri === 'src/chat.ts');
  });
  if (!finding) {
    const rules = results.map(({ result }) => result.ruleId).join(', ') || 'none';
    throw new Error(`Expected an AI001 finding in ${demoFolder}/src/chat.ts; scanner reported: ${rules}`);
  }

  const score = Number(finding.rule?.properties?.['security-severity']);
  const scoreSeverity = Number.isFinite(score)
    ? score >= 9 ? 'CRITICAL' : score >= 7 ? 'HIGH' : score >= 4 ? 'MEDIUM' : 'LOW'
    : undefined;
  const severity = finding.result.properties?.severity
    ?? finding.rule?.properties?.severity
    ?? scoreSeverity
    ?? finding.result.level?.toUpperCase()
    ?? 'at or above HIGH threshold';
  const location = finding.result.locations?.[0]?.physicalLocation;
  const line = location?.region?.startLine;
  const message = finding.result.message?.text ?? 'User input reaches an LLM system prompt.';
  if (severity !== 'HIGH') {
    throw new Error(`Expected the positive-control finding to be HIGH; SARIF reported ${severity}.`);
  }
  return { finding, severity, line, message, total: results.length };
}

function findNpxCli() {
  const candidates = [
    process.env.npm_execpath && join(dirname(process.env.npm_execpath), 'npx-cli.js'),
    join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npx-cli.js'),
    process.env.npm_config_prefix
      && join(process.env.npm_config_prefix, 'node_modules', 'npm', 'bin', 'npx-cli.js'),
    process.env.APPDATA
      && join(process.env.APPDATA, 'npm', 'node_modules', 'npm', 'bin', 'npx-cli.js'),
  ].filter(Boolean);
  const cliPath = candidates.find((candidate) => existsSync(candidate));
  if (!cliPath) {
    throw new Error('Could not locate npm\'s npx CLI. Install the pinned npm version or run this example in CI.');
  }
  return cliPath;
}

let failed;
try {
  mkdirSync(dirname(sourcePath), { recursive: true });
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(sourcePath, vulnerableExample, 'utf8');

  const scannerArguments = [
    '--yes',
    `secureai-scan@${scannerVersion}`,
    'scan',
    demoRoot,
    '--rules',
    'AI001',
    '--output',
    reportPath,
    '--fail-on',
    'high',
  ];
  const isWindows = process.platform === 'win32';
  const command = isWindows ? process.execPath : 'npx';
  const commandArguments = isWindows
    ? [findNpxCli(), ...scannerArguments]
    : scannerArguments;
  const scan = spawnSync(
    command,
    commandArguments,
    { cwd: repositoryRoot, encoding: 'utf8' },
  );

  if (scan.stdout) process.stdout.write(scan.stdout);
  if (scan.stderr) process.stderr.write(scan.stderr);
  if (scan.error) throw scan.error;
  if (scan.status !== 0 && scan.status !== 1) {
    throw new Error(`SecureAI-Scan failed with exit code ${scan.status}.`);
  }
  if (!existsSync(reportPath)) {
    throw new Error(`SecureAI-Scan did not create the expected SARIF report: ${reportPath}`);
  }
  if (scan.status !== 1) {
    throw new Error(`Expected SecureAI-Scan to block the HIGH example; received exit code ${scan.status}.`);
  }

  const summary = summarizeResult(JSON.parse(readFileSync(reportPath, 'utf8')), basename(demoRoot));
  const title = 'OWASP GenAI example: expected finding detected';
  const detail = `SecureAI-Scan ${scannerVersion} reported ${summary.severity} ${summary.finding.result.ruleId} at ${summary.line ? `chat.ts:${summary.line}` : 'chat.ts'} and exited 1 at the configured high threshold. The report contains ${summary.total} finding(s).`;
  console.log(`${title}\n${detail}\n${summary.message}`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    writeFileSync(process.env.GITHUB_STEP_SUMMARY, `## ${title}\n\n${detail}\n\n${summary.message}\n`, { flag: 'a' });
  }
} catch (error) {
  failed = error;
} finally {
  rmSync(demoRoot, { recursive: true, force: true });
  if (!process.env.SECUREAI_DEMO_REPORT) rmSync(reportPath, { force: true });
}

if (failed) throw failed;
