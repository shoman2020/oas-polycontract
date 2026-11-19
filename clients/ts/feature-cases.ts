import { readFileSync } from "node:fs";

export interface AcceptanceCase {
  caseId: string;
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

const cases = JSON.parse(readFileSync(process.env.FEATURE_CASES_PATH!, "utf8")) as AcceptanceCase[];

export function acceptanceCase(caseId: string): AcceptanceCase {
  const scenario = cases.find((testCase) => testCase.caseId === caseId);
  if (!scenario) throw new Error(`Acceptance feature case not found: ${caseId}`);
  return scenario;
}

export function acceptanceCases(api: string): AcceptanceCase[] {
  return cases.filter(({ caseId }) => caseId.startsWith(`${api}.`));
}
