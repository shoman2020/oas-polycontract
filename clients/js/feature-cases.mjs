import { readFileSync } from "node:fs";

const cases = JSON.parse(readFileSync(process.env.FEATURE_CASES_PATH, "utf8"));

export function acceptanceCase(caseId) {
  const scenario = cases.find((testCase) => testCase.caseId === caseId);
  if (!scenario) throw new Error(`Acceptance feature case not found: ${caseId}`);
  return scenario;
}

export function acceptanceCases(prefix) {
  return cases.filter(({ caseId }) => caseId.startsWith(`${prefix}.`));
}
