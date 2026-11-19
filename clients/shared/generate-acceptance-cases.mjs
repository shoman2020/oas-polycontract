import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { formatFeatureCases, readFeatureCases } from './feature-cases.mjs';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const featureDirectory = join(repositoryRoot, 'clients/features');
const outputPath = join(repositoryRoot, 'clients/shared/acceptance-cases.json');
const cases = readFeatureCases(featureDirectory);
const expected = formatFeatureCases(cases);

if (process.argv.includes('--check')) {
  let actual;
  try {
    actual = readFileSync(outputPath, 'utf8');
  } catch {
    console.error('Acceptance case data is missing; run node clients/shared/generate-acceptance-cases.mjs');
    process.exitCode = 1;
  }
  if (actual !== undefined && actual !== expected) {
    console.error('Acceptance case data is stale; run node clients/shared/generate-acceptance-cases.mjs');
    process.exitCode = 1;
  }
} else {
  writeFileSync(outputPath, expected);
  console.log(`Wrote ${cases.length} acceptance cases from ${new Set(cases.map(({ api }) => api)).size} API features.`);
}
