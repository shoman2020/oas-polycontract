import { readFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';

const FEATURE_FILE = /^([a-z][a-z0-9-]*)-api\.feature$/;

export function parseFeatureSources(sources) {
  const cases = [];
  const caseIds = new Set();

  for (const { fileName, contents } of sources) {
    const match = FEATURE_FILE.exec(basename(fileName));
    if (!match) throw new Error(`Unsupported feature file: ${fileName}`);

    const api = match[1];
    const lines = contents.split(/\r?\n/);
    let featureName;
    let scenarioName;
    let scenarioDataCount = 0;

    const finishScenario = () => {
      if (scenarioName && scenarioDataCount !== 1) {
        throw new Error(`${fileName}: scenario "${scenarioName}" must have exactly one JSON acceptance data block`);
      }
    };

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index].trim();
      const feature = /^Feature:\s*(.+)$/.exec(line);
      const scenario = /^Scenario:\s*(.+)$/.exec(line);

      if (feature) {
        if (featureName) throw new Error(`${fileName}: multiple Feature declarations are not supported`);
        featureName = feature[1];
        continue;
      }
      if (scenario) {
        finishScenario();
        if (!featureName) throw new Error(`${fileName}: Scenario must follow its Feature declaration`);
        scenarioName = scenario[1];
        scenarioDataCount = 0;
        continue;
      }
      if (line !== '"""json') continue;

      const jsonLines = [];
      index += 1;
      while (index < lines.length && lines[index].trim() !== '"""') {
        jsonLines.push(lines[index]);
        index += 1;
      }
      if (index >= lines.length) throw new Error(`${fileName}: unterminated JSON DocString`);
      if (!scenarioName) throw new Error(`${fileName}: JSON acceptance data must belong to a scenario`);
      if (scenarioDataCount > 0) {
        throw new Error(`${fileName}: scenario "${scenarioName}" has multiple JSON acceptance data blocks`);
      }

      let data;
      try {
        data = JSON.parse(jsonLines.join('\n'));
      } catch (error) {
        throw new Error(`${fileName}: invalid JSON in scenario "${scenarioName}": ${error.message}`);
      }
      if (!data || typeof data !== 'object' || Array.isArray(data) || typeof data.caseId !== 'string') {
        throw new Error(`${fileName}: scenario "${scenarioName}" needs an object with a caseId`);
      }
      if (!data.caseId.startsWith(`${api}.`)) {
        throw new Error(`${fileName}: caseId "${data.caseId}" must start with "${api}."`);
      }
      if (['api', 'feature', 'scenario'].some((key) => Object.hasOwn(data, key))) {
        throw new Error(`${fileName}: acceptance data must not override generated scenario metadata`);
      }
      if (caseIds.has(data.caseId)) throw new Error(`Duplicate acceptance case: ${data.caseId}`);

      caseIds.add(data.caseId);
      scenarioDataCount += 1;
      cases.push({ ...data, api, feature: featureName, scenario: scenarioName });
    }

    if (!featureName) throw new Error(`${fileName}: Feature declaration is missing`);
    finishScenario();
  }

  return cases;
}

export function readFeatureCases(featureDirectory) {
  const sources = readdirSync(featureDirectory)
    .filter((fileName) => FEATURE_FILE.test(fileName))
    .sort()
    .map((fileName) => ({ fileName, contents: readFileSync(join(featureDirectory, fileName), 'utf8') }));
  if (sources.length === 0) throw new Error(`No API feature files found in ${featureDirectory}`);
  return parseFeatureSources(sources);
}

export function formatFeatureCases(cases) {
  return `${JSON.stringify(cases, null, 2)}\n`;
}

