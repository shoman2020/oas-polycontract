import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const mockUrl = process.env.MOCK_URL ?? "http://localhost:9000";
const evaluationPath = process.env.MOCK_EVALS_PATH
  ?? fileURLToPath(new URL("../../../evals/mock-data-evals.json", import.meta.url));
const { cases } = JSON.parse(readFileSync(evaluationPath, "utf8"));

async function getWithRetry(path) {
  let lastError;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      return await fetch(`${mockUrl}${path}`, { signal: AbortSignal.timeout(3000) });
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw lastError ?? new Error("Specmatic mock did not become ready");
}

for (const testCase of cases) {
  const response = await getWithRetry(testCase.path);
  const actualBody = await response.json();

  if (testCase.kind === "external-example") {
    assert.equal(response.status, testCase.expected.status, testCase.id);
    assert.deepEqual(actualBody, testCase.expected.body, testCase.id);
    console.log(`PASS ${testCase.id}: GET ${testCase.path} -> ${response.status}, exact fixture response`);
    continue;
  }

  assert.equal(response.status, testCase.expectedStatus, testCase.id);
  for (const [field, allowedValues] of Object.entries(testCase.allowed)) {
    assert.ok(allowedValues.includes(actualBody[field]), `${testCase.id}: unexpected ${field} value`);
  }
  console.log(`PASS ${testCase.id}: GET ${testCase.path} -> ${response.status}, response fields match allowed values`);
}

