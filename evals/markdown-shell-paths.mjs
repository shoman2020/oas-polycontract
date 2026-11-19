import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { relative, resolve, isAbsolute } from 'node:path';

const ignoredDirectories = new Set(['.git', 'node_modules']);
const shellFencePattern = /^```(?:sh|bash|shell)\s*\r?\n([\s\S]*?)^```\s*$/gm;

function listMarkdownFiles(root) {
  const files = [];
  function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!ignoredDirectories.has(entry.name)) visit(resolve(directory, entry.name));
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
        files.push(resolve(directory, entry.name));
      }
    }
  }
  visit(root);
  return files.sort();
}

function tokenize(line) {
  return [...line.matchAll(/"([^"]*)"|'([^']*)'|(\S+)/g)]
    .map((match) => match[1] ?? match[2] ?? match[3]);
}

function commandSegments(tokens) {
  const segments = [];
  let current = [];
  for (const token of tokens) {
    if (token === '&&' || token === '||' || token === ';') {
      if (current.length) segments.push(current);
      current = [];
    } else if (token.endsWith(';')) {
      current.push(token.slice(0, -1));
      if (current.length) segments.push(current);
      current = [];
    } else {
      current.push(token);
    }
  }
  if (current.length) segments.push(current);
  return segments;
}

function localPath(value, root) {
  let candidate = value;
  if (candidate.startsWith('${PWD}/')) candidate = candidate.slice(7);
  else if (candidate.startsWith('$PWD/')) candidate = candidate.slice(5);
  if (!candidate || candidate.includes('$') || candidate.includes('`') || /[*?]/.test(candidate)) return null;
  if (isAbsolute(candidate) || /^[a-z]:[\\/]/i.test(candidate)) return null;
  return resolve(root, candidate.replace(/^\.\//, ''));
}

function addPathIssue(issues, docPath, blockNumber, command, candidate, kind, root) {
  const resolved = localPath(candidate, root);
  if (resolved === null) return 0;
  let valid = existsSync(resolved);
  if (kind === 'directory') valid = valid && statSync(resolved).isDirectory();
  if (kind === 'file') valid = valid && statSync(resolved).isFile();
  if (!valid) {
    const display = relative(root, resolved).replaceAll('\\', '/');
    issues.push(docPath + ': shell block ' + blockNumber + ': ' + command + ' references missing ' + kind + ' ' + display);
  }
  return 1;
}

function checkDockerBuild(tokens, root, docPath, blockNumber, issues) {
  const args = tokens.slice(2);
  const context = args.at(-1);
  if (!context || context.startsWith('-')) return 0;
  const contextPath = localPath(context, root);
  if (contextPath === null) return 0;
  let checked = 1;
  if (!existsSync(contextPath) || !statSync(contextPath).isDirectory()) {
    issues.push(docPath + ': shell block ' + blockNumber + ': docker build references missing directory ' + context);
    return checked;
  }
  const fileIndex = args.findIndex((arg) => arg === '-f' || arg === '--file');
  const configuredFile = fileIndex >= 0 ? args[fileIndex + 1] : null;
  const dockerfile = configuredFile ? localPath(configuredFile, root) : resolve(contextPath, 'Dockerfile');
  if (dockerfile !== null && (!existsSync(dockerfile) || !statSync(dockerfile).isFile())) {
    issues.push(docPath + ': shell block ' + blockNumber + ': docker build context has no Dockerfile');
  }
  return checked + 1;
}

function checkDockerMounts(tokens, root, docPath, blockNumber, issues) {
  let checked = 0;
  for (let index = 2; index < tokens.length; index += 1) {
    let specification;
    if (tokens[index] === '-v' || tokens[index] === '--volume') {
      specification = tokens[index + 1];
    } else if (tokens[index].startsWith('--volume=')) {
      specification = tokens[index].slice('--volume='.length);
    } else if (tokens[index] === '--mount') {
      specification = tokens[index + 1];
      const source = specification?.split(',').find((part) => part.startsWith('source='))?.slice('source='.length);
      if (source) checked += addPathIssue(issues, docPath, blockNumber, 'docker run --mount', source, 'path', root);
      continue;
    } else if (tokens[index].startsWith('--mount=')) {
      const source = tokens[index].slice('--mount='.length).split(',').find((part) => part.startsWith('source='))?.slice('source='.length);
      if (source) checked += addPathIssue(issues, docPath, blockNumber, 'docker run --mount', source, 'path', root);
      continue;
    }
    if (specification) {
      const source = specification.split(':', 1)[0];
      checked += addPathIssue(issues, docPath, blockNumber, 'docker run volume', source, 'path', root);
    }
  }
  return checked;
}

function inspectCommand(tokens, root, docPath, blockNumber, issues) {
  let index = 0;
  while (/^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[index] ?? '')) index += 1;
  if (tokens[index] === 'sudo' || tokens[index] === 'command') index += 1;
  const command = tokens[index];
  if (!command) return 0;
  const args = tokens.slice(index + 1);

  if (command === 'source' || command === '.') {
    return args[0] ? addPathIssue(issues, docPath, blockNumber, command, args[0], 'file', root) : 0;
  }
  if (command === 'node') {
    if (['-e', '--eval', '-p', '--print'].includes(args[0])) return 0;
    return args.filter((arg) => /\.(?:mjs|cjs|js|ts)$/i.test(arg))
      .reduce((count, arg) => count + addPathIssue(issues, docPath, blockNumber, command, arg, 'file', root), 0);
  }
  if (command === 'bash' || command === 'sh') {
    if (['-c', '-lc', '--command'].includes(args[0])) return 0;
    const script = args.find((arg) => !arg.startsWith('-') && /\.(?:sh|bash)$/i.test(arg));
    return script ? addPathIssue(issues, docPath, blockNumber, command, script, 'file', root) : 0;
  }
  if (command === 'docker' && args[0] === 'build') {
    return checkDockerBuild(tokens.slice(index), root, docPath, blockNumber, issues);
  }
  if (command === 'docker' && args[0] === 'run') {
    return checkDockerMounts(tokens.slice(index), root, docPath, blockNumber, issues);
  }
  return 0;
}

export function auditMarkdownShellPaths(repositoryRoot) {
  const markdownFiles = listMarkdownFiles(repositoryRoot);
  const issues = [];
  let blocksChecked = 0;
  let pathReferencesChecked = 0;

  for (const absolutePath of markdownFiles) {
    const docPath = relative(repositoryRoot, absolutePath).replaceAll('\\', '/');
    const content = readFileSync(absolutePath, 'utf8');
    const blocks = [...content.matchAll(shellFencePattern)].map((match) => match[1]);
    blocks.forEach((block, blockIndex) => {
      blocksChecked += 1;
      const commands = block.replace(/\\\s*\r?\n[ \t]*/g, ' ').split(/\r?\n/);
      for (const line of commands) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        for (const segment of commandSegments(tokenize(trimmed))) {
          pathReferencesChecked += inspectCommand(segment, repositoryRoot, docPath, blockIndex + 1, issues);
        }
      }
    });
  }

  return { markdownFiles: markdownFiles.length, blocksChecked, pathReferencesChecked, issues };
}
