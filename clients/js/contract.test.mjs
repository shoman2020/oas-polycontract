import assert from "node:assert/strict";
import test from "node:test";
import { createValidator } from "@oaverify/core";
import { loadSpecSync } from "@oaverify/syntax";

const baseUrl = process.env.API_BASE_URL;
const { document } = loadSpecSync({ entry: process.env.OPENAPI_SPEC });
const validator = createValidator(document);

test("product response matches the OpenAPI contract", async () => {
  const request = new Request(`${baseUrl}/products/demo-sku`);
  const response = await fetch(request);
  const result = await validator.validateFetchResponse(request, response);

  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.body.sku, "demo-sku");
  assert.equal(result.body.available, 7);
  console.log(`OAS validation passed: GET /products/demo-sku -> ${response.status}`);
});
