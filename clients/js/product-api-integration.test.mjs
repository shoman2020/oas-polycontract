import assert from "node:assert/strict";
import test from "node:test";
import { createValidator } from "@oaverify/core";
import { loadSpecSync } from "@oaverify/syntax";
import { ProductApiClient } from "./api-client.mjs";

const { document } = loadSpecSync({ entry: process.env.OPENAPI_SPEC });
const validator = createValidator(document);
const api = new ProductApiClient({ baseUrl: process.env.API_BASE_URL });

test("product response matches the OpenAPI contract", async () => {
  const { request, response } = await api.getProduct("demo-sku");
  const result = await validator.validateFetchResponse(request, response);

  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.body.sku, "demo-sku");
  assert.equal(result.body.available, 7);
  console.log(`OAS validation passed: GET /products/demo-sku -> ${response.status}`);
});

for (const [sku, expectedStatus, expectedMessage] of [
  ["not-found-sku", 404, "No inventory record for not-found-sku"],
  ["malformed-sku", 502, "Inventory service unavailable"],
]) {
  test(`product error response for ${sku} matches the OpenAPI contract`, async () => {
    const { request, response } = await api.getProduct(sku);
    const result = await validator.validateFetchResponse(request, response);

    assert.equal(result.ok, true, JSON.stringify(result));
    assert.equal(response.status, expectedStatus);
    assert.equal(result.body.message, expectedMessage);
  });
}

test("Reject a malformed SKU path", async () => {
  const request = new Request(new URL("/products/%E0%A4%A", process.env.API_BASE_URL));
  const response = await fetch(request);
  const result = await validator.validateFetchResponse(request, response);

  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(response.status, 400);
  assert.equal(result.body.message, "Invalid SKU encoding");
});

