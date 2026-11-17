import assert from "node:assert/strict";
import test from "node:test";
import { createValidator } from "@oaverify/core";
import { loadSpecSync } from "@oaverify/syntax";
import { StatefulOrderApiClient } from "./order-api-client.mjs";

const { document } = loadSpecSync({ entry: process.env.STATEFUL_OPENAPI_SPEC });
const validator = createValidator(document);
const api = new StatefulOrderApiClient({ baseUrl: process.env.STATEFUL_API_BASE_URL });

async function validate(operation) {
  const { request, response } = await operation;
  const result = await validator.validateFetchResponse(request, response);
  assert.equal(result.ok, true, JSON.stringify(result));
  return { result, status: response.status };
}

test("stateful order lifecycle matches the OpenAPI contract", async () => {
  const created = await validate(api.createOrder("demo-sku", 2));
  assert.equal(created.status, 201);
  assert.equal(created.result.body.status, "created");
  const orderId = created.result.body.id;

  const fetched = await validate(api.getOrder(orderId));
  assert.equal(fetched.status, 200);
  assert.equal(fetched.result.body.id, orderId);

  const updated = await validate(api.updateOrder(orderId, "confirmed"));
  assert.equal(updated.status, 200);
  assert.equal(updated.result.body.status, "confirmed");

  const deleted = await validate(api.deleteOrder(orderId));
  assert.equal(deleted.status, 204);

  const missing = await validate(api.getOrder(orderId));
  assert.equal(missing.status, 404);
  assert.equal(missing.result.body.message, "Order not found");
  console.log("Stateful OAS validation passed: create -> read -> confirm -> delete -> 404");
});
