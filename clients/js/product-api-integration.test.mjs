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

