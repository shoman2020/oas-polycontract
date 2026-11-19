import assert from 'node:assert/strict';
import test from 'node:test';
import { completeStageReport } from './stage-report.mjs';

test('reports completed, failed, and not-run stages in plan order', () => {
  const stages = completeStageReport(
    ['lint', 'compatibility', 'integration'],
    [
      { name: 'lint', seconds: 4, result: 'passed' },
      { name: 'compatibility', seconds: 1, result: 'failed' },
    ],
  );

  assert.deepEqual(stages, [
    { name: 'lint', seconds: 4, result: 'passed' },
    { name: 'compatibility', seconds: 1, result: 'failed' },
    { name: 'integration', seconds: 0, result: 'skipped' },
  ]);
});

test('preserves complete successful reports without adding skipped stages', () => {
  const completed = [{ name: 'lint', seconds: 4, result: 'passed' }];
  assert.deepEqual(completeStageReport(['lint'], completed), completed);
});
