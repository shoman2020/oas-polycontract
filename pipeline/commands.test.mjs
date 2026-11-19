import assert from 'node:assert/strict';
import test from 'node:test';
import { runChildProcess } from './commands.mjs';

test('awaits a child process and captures piped diagnostics', async () => {
  const result = await runChildProcess(process.execPath, [
    '-e',
    "process.stderr.write('child diagnostic'); process.exitCode = 7",
  ], { stdio: ['ignore', 'ignore', 'pipe'] });

  assert.equal(result.exitCode, 7);
  assert.equal(result.signal, null);
  assert.equal(result.stderr, 'child diagnostic');
});

test('rejects when the executable cannot be started', async () => {
  await assert.rejects(
    runChildProcess('__oas_polycontract_command_that_does_not_exist__', [], { stdio: 'ignore' }),
    { code: 'ENOENT' },
  );
});
