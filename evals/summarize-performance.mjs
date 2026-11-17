import { appendFileSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sampleDirectory = resolve(process.argv[2] ?? '.artifacts/performance');
const files = readdirSync(sampleDirectory)
  .filter((file) => /^run-\d+\.csv$/.test(file))
  .sort((left, right) => Number(left.match(/\d+/)[0]) - Number(right.match(/\d+/)[0]));

if (files.length !== 5) throw new Error(`Expected 5 timing samples; found ${files.length}`);

const samples = files.map((file) => {
  const rows = new Map();
  for (const line of readFileSync(resolve(sampleDirectory, file), 'utf8').trim().split(/\r?\n/).slice(1)) {
    const match = line.match(/^(?:"([^"]+)"|([^,]+)),(\d+),(passed|failed)$/);
    if (!match) throw new Error(`${file}: invalid timing row: ${line}`);
    const [, quotedStage, plainStage, seconds, result] = match;
    if (result !== 'passed') throw new Error(`${file}: ${quotedStage ?? plainStage} did not pass`);
    rows.set(quotedStage ?? plainStage, Number(seconds));
  }
  return { file, rows };
});

const median = (values) => {
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
};
const stages = [...samples[0].rows.keys()];
const lines = [
  '# Pipeline performance samples',
  '',
  'One cold Docker-cache run, followed by four warm runs on the same GitHub runner.',
  '',
  '| Stage | Cold (s) | Warm median (s) | Warm range (s) |',
  '|---|---:|---:|---:|',
];

for (const stage of stages) {
  if (samples.some((sample) => !sample.rows.has(stage))) {
    throw new Error(`Timing stage is missing from one or more samples: ${stage}`);
  }
  const cold = samples[0].rows.get(stage);
  const warm = samples.slice(1).map((sample) => sample.rows.get(stage));
  lines.push(`| ${stage} | ${cold} | ${median(warm)} | ${Math.min(...warm)}–${Math.max(...warm)} |`);
}

const summary = `${lines.join('\n')}\n`;
writeFileSync(resolve(sampleDirectory, 'summary.md'), summary);
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n${summary}`);
