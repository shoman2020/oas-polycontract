import { readFileSync } from "node:fs";

let cachedCases;

function getCases() {
  if (!cachedCases) {
    const path = process.env.FEATURE_CASES_PATH;
    if (!path) throw new Error("FEATURE_CASES_PATH environment variable is required");
    cachedCases = JSON.parse(readFileSync(path, "utf8"));
  }
  return cachedCases;
}

export function acceptanceCase(caseId) {
  const scenario = getCases().find((testCase) => testCase.caseId === caseId);
  if (!scenario) throw new Error(`Acceptance feature case not found: ${caseId}`);
  return scenario;
}

export function acceptanceCases(prefix) {
  return getCases().filter(({ caseId }) => caseId.startsWith(`${prefix}.`));
}
