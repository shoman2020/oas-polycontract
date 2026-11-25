import assert from "node:assert/strict";
import test from "node:test";
import { createValidator } from "@oaverify/core";
import { loadSpecSync } from "@oaverify/syntax";
import { ProductApiClient } from "./api-client.mjs";
import { acceptanceCase, acceptanceCases } from "./feature-cases.mjs";

const { document } = loadSpecSync({ entry: process.env.OPENAPI_SPEC });
const validator = createValidator(document);
const createProductApi = () => new ProductApiClient({ baseUrl: process.env.API_BASE_URL });

test("product response matches the OpenAPI contract", async () => {
  const api = createProductApi();
  const scenario = acceptanceCase("product.available");
  const { request, response } = await api.getProduct(scenario.sku);
  const result = await validator.validateFetchResponse(request, response);

  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(response.status, scenario.expectedStatus);
  assert.equal(result.body.sku, scenario.sku);
  assert.equal(result.body.available, scenario.available);
  console.log(`OAS validation passed: GET /products/${scenario.sku} -> ${response.status}`);
});

for (const scenario of acceptanceCases("product").filter(({ caseId }) => ["product.not-found", "product.bad-upstream"].includes(caseId))) {
  test(`${scenario.scenario} matches the OpenAPI contract`, async () => {
    const api = createProductApi();
    const { request, response } = await api.getProduct(scenario.sku);
    const result = await validator.validateFetchResponse(request, response);

    assert.equal(result.ok, true, JSON.stringify(result));
    assert.equal(response.status, scenario.expectedStatus);
    assert.equal(result.body.message, scenario.expectedMessage);
  });
}

const malformedPathScenario = acceptanceCase("product.malformed-path");

test(malformedPathScenario.scenario, async () => {
  const api = createProductApi();
  const scenario = malformedPathScenario;
  const { request, response } = await api.getProductPath(scenario.path);
  const result = await validator.validateFetchResponse(request, response);

  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(response.status, scenario.expectedStatus);
  assert.equal(result.body.message, scenario.expectedMessage);
});

