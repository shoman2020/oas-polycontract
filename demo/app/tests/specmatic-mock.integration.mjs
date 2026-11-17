import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const mockUrl = new URL(process.env.MOCK_URL ?? "http://localhost:9000");
const allowedMockHosts = new Set(["localhost", "127.0.0.1", "::1", "specmatic-mock"]);
if (mockUrl.protocol !== "http:"
  || !allowedMockHosts.has(mockUrl.hostname)
  || mockUrl.username
  || mockUrl.password
  || mockUrl.port !== "9000"
  || mockUrl.pathname !== "/"
  || mockUrl.search
  || mockUrl.hash) {
  throw new Error("MOCK_URL must be an HTTP URL for the local Specmatic mock service");
}
const evaluationPath = process.env.MOCK_EVALS_PATH
  ?? fileURLToPath(new URL("../../../evals/mock-data-evals.json", import.meta.url));
const { cases } = JSON.parse(readFileSync(evaluationPath, "utf8"));

// Keep outbound request paths in code; the JSON evaluation file supplies expected data only.
const mockRequests = [
  { id: "demo-product-fixture", path: "/products/demo-sku" },
  { id: "vip-product-fixture", path: "/products/vip-sku" },
  { id: "dictionary-fallback", path: "/products/not-in-examples" },
];

async function getWithRetry(path) {
  if (!/^\/products\/[a-z0-9-]+$/.test(path)) {
    throw new Error(`Refusing unexpected Specmatic mock path: ${path}`);
  }
  const requestUrl = new URL(path, mockUrl);
  if (requestUrl.origin !== mockUrl.origin || requestUrl.pathname !== path) {
    throw new Error("Specmatic mock request must stay on the configured local origin");
  }

  let lastError;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      return await fetch(requestUrl, {
        redirect: "error",
        signal: AbortSignal.timeout(3000),
      });
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw lastError ?? new Error("Specmatic mock did not become ready");
}

assert.equal(cases.length, mockRequests.length, "mock evaluation cases changed without updating their safe request paths");

for (const mockRequest of mockRequests) {
  const testCase = cases.find((candidate) => candidate.id === mockRequest.id);
  assert.ok(testCase, `missing mock evaluation case: ${mockRequest.id}`);
  assert.equal(testCase.path, mockRequest.path, `${mockRequest.id}: unsafe or unexpected path`);

  const response = await getWithRetry(mockRequest.path);
  const actualBody = await response.json();

  if (testCase.kind === "external-example") {
    assert.equal(response.status, testCase.expected.status, testCase.id);
    assert.deepEqual(actualBody, testCase.expected.body, testCase.id);
    console.log(`PASS ${testCase.id}: GET ${mockRequest.path} -> ${response.status}, exact fixture response`);
    continue;
  }

  assert.equal(response.status, testCase.expectedStatus, testCase.id);
  for (const [field, allowedValues] of Object.entries(testCase.allowed)) {
    assert.ok(allowedValues.includes(actualBody[field]), `${testCase.id}: unexpected ${field} value`);
  }
  console.log(`PASS ${testCase.id}: GET ${mockRequest.path} -> ${response.status}, response fields match allowed values`);
}

