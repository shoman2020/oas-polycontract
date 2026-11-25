import assert from "node:assert/strict";
import test from "node:test";
import { createValidator } from "@oaverify/core";
import { loadSpecSync } from "@oaverify/syntax";
import { StatefulOrderApiClient } from "./order-api-client.mjs";
import { acceptanceCase } from "./feature-cases.mjs";

const { document } = loadSpecSync({ entry: process.env.STATEFUL_OPENAPI_SPEC });
const validator = createValidator(document);
const createOrderApi = () => new StatefulOrderApiClient({ baseUrl: process.env.STATEFUL_API_BASE_URL });
const statefulApiBaseUrl = process.env.STATEFUL_API_BASE_URL;

async function validate(operation) {
  const { request, response } = await operation;
  const result = await validator.validateFetchResponse(request, response);
  assert.equal(result.ok, true, JSON.stringify(result));
  return { result, status: response.status };
}

test("stateful order lifecycle matches the OpenAPI contract", async () => {
  const api = createOrderApi();
  const scenario = acceptanceCase("order.confirm");
  const created = await validate(api.createOrder(scenario.sku, scenario.quantity));
  assert.equal(created.status, 201);
  assert.equal(created.result.body.status, "created");
  const orderId = created.result.body.id;

  const fetched = await validate(api.getOrder(orderId));
  assert.equal(fetched.status, 200);
  assert.equal(fetched.result.body.id, orderId);

  for (let attempt = 0; attempt < scenario.repeatCount; attempt += 1) {
    const updated = await validate(api.updateOrder(orderId, scenario.status));
    assert.equal(updated.status, scenario.expectedStatus);
    assert.equal(updated.result.body.status, scenario.status);
  }

  const deleted = await validate(api.deleteOrder(orderId));
  assert.equal(deleted.status, 204);

  const missing = await validate(api.getOrder(orderId));
  assert.equal(missing.status, 404);
  assert.equal(missing.result.body.message, "Order not found");
  console.log("Stateful OAS validation passed: create -> read -> confirm -> delete -> 404");
});

test("stateful order validation and conflict responses match the OpenAPI contract", async () => {
  const api = createOrderApi();
  const invalidCase = acceptanceCase("order.invalid");
  const invalid = await validate(api.createOrder(invalidCase.sku, invalidCase.quantity));
  assert.equal(invalid.status, invalidCase.expectedStatus);

  const scenario = acceptanceCase("order.illegal-transition");
  const created = await validate(api.createOrder(scenario.sku, scenario.quantity));
  assert.equal(created.status, 201);
  const orderId = created.result.body.id;

  for (let attempt = 0; attempt < scenario.repeatCount; attempt += 1) {
    const cancelled = await validate(api.updateOrder(orderId, scenario.initialStatus));
    assert.equal(cancelled.status, 200);
    assert.equal(cancelled.result.body.status, scenario.persistedStatus);
  }

  const conflict = await validate(api.updateOrder(orderId, scenario.requestedStatus));
  assert.equal(conflict.status, scenario.expectedStatus);
  assert.match(conflict.result.body.message, /Cannot change order/);

  const deleted = await validate(api.deleteOrder(orderId));
  assert.equal(deleted.status, 204);
});

test("Reject an unsupported method on the health endpoint", async () => {
  const scenario = acceptanceCase("order.unsupported-method");
  const request = new Request(new URL(scenario.path, statefulApiBaseUrl), { method: scenario.method });
  const response = await fetch(request);

  assert.equal(response.status, scenario.expectedStatus);
  assert.equal(response.headers.get("allow"), scenario.allowedMethod);
  assert.equal(typeof (await response.json()).message, "string");
});
