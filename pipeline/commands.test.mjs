import assert from 'node:assert/strict';
import test from 'node:test';
import { runChildProcess } from './commands.mjs';

test('awaits a child process and captures piped output', async () => {
  const result = await runChildProcess(process.execPath, [
    '-e',
    "process.stdout.write('child output'); process.stderr.write('child diagnostic'); process.exitCode = 7",
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  assert.equal(result.exitCode, 7);
  assert.equal(result.signal, null);
  assert.equal(result.stdout, 'child output');
  assert.equal(result.stderr, 'child diagnostic');
});

test('rejects when the executable cannot be started', async () => {
  await assert.rejects(
    runChildProcess('__oas_polycontract_command_that_does_not_exist__', [], { stdio: 'ignore' }),
    { code: 'ENOENT' },
  );
});
