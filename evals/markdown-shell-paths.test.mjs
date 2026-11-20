import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { auditMarkdownShellPaths } from './markdown-shell-paths.mjs';

function createFixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'markdown-shell-paths-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, '.github'), { recursive: true });
  mkdirSync(join(root, 'scripts'), { recursive: true });
  mkdirSync(join(root, 'service'), { recursive: true });
  mkdirSync(join(root, 'fixtures'), { recursive: true });
  writeFileSync(join(root, '.github', 'versions.env'), 'NODE_VERSION=1\n');
  writeFileSync(join(root, 'run.sh'), '#!/usr/bin/env bash\n');
  writeFileSync(join(root, 'scripts', 'check.mjs'), 'export {};\n');
  writeFileSync(join(root, 'service', 'Dockerfile'), 'FROM scratch\n');
  return root;
}

test('checks local scripts, Docker contexts, and static bind sources in Markdown shell blocks', (t) => {
  const root = createFixture(t);
  writeFileSync(join(root, 'README.md'), [
    '```sh',
    'source .github/versions.env',
    'node scripts/check.mjs',
    'bash ./run.sh',
    'docker build -t demo ./service',
    'docker run --rm -v "$PWD/fixtures:/data:ro" example/image',
    '```',
    '',
    '```json',
    'docker build -t ignored ./missing',
    '```',
  ].join('\n'));

  const result = auditMarkdownShellPaths(root);
  assert.deepEqual(result.issues, []);
  assert.equal(result.blocksChecked, 1);
  assert.equal(result.pathReferencesChecked, 6);
});

test('reports missing scripts, build contexts, and bind sources', (t) => {
  const root = createFixture(t);
  writeFileSync(join(root, 'README.md'), [
    '```bash',
    'node scripts/missing.mjs',
    'docker build -t demo ./missing',
    'docker run --rm -v "$PWD/missing:/data:ro" example/image',
    '```',
  ].join('\n'));

  const result = auditMarkdownShellPaths(root);
  assert.equal(result.issues.length, 3);
  assert.match(result.issues[0], /scripts\/missing\.mjs/);
  assert.match(result.issues[1], /docker build references missing directory/);
  assert.match(result.issues[2], /missing path/);
});

test('reports a Docker build context without a Dockerfile', (t) => {
  const root = createFixture(t);
  mkdirSync(join(root, 'empty-context'));
  writeFileSync(join(root, 'README.md'), '```sh\ndocker build ./empty-context\n```\n');

  const result = auditMarkdownShellPaths(root);
  assert.equal(result.issues.length, 1);
  assert.match(result.issues[0], /no Dockerfile/);
});
