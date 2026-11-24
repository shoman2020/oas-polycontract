import { readFileSync } from "node:fs";

export interface AcceptanceCase {
  caseId: string;
  api: string;
  feature: string;
  scenario: string;
  sku?: string;
  quantity?: number;
  available?: number;
  expectedStatus: number;
  expectedMessage?: string;
  status?: string;
  repeatCount?: number;
  initialStatus?: string;
  requestedStatus?: string;
  persistedStatus?: string;
  method?: string;
  path?: string;
  allowedMethod?: string;
}

let cachedCases: AcceptanceCase[] | undefined;

function getCases(): AcceptanceCase[] {
  if (!cachedCases) {
    const path = process.env.FEATURE_CASES_PATH;
    if (!path) throw new Error("FEATURE_CASES_PATH environment variable is required");
    cachedCases = JSON.parse(readFileSync(path, "utf8")) as AcceptanceCase[];
  }
  return cachedCases;
}

export function acceptanceCase(caseId: string): AcceptanceCase {
  const scenario = getCases().find((testCase) => testCase.caseId === caseId);
  if (!scenario) throw new Error(`Acceptance feature case not found: ${caseId}`);
  return scenario;
}

export function acceptanceCases(api: string): AcceptanceCase[] {
  return getCases().filter(({ caseId }) => caseId.startsWith(`${api}.`));
}
