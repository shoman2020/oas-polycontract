import assert from "node:assert/strict";
import test from "node:test";
import { createValidator } from "@oaverify/core";
import { loadSpecSync } from "@oaverify/syntax";
import { StatefulOrderApiClient } from "./order-api-client.mjs";

const { document } = loadSpecSync({ entry: process.env.STATEFUL_OPENAPI_SPEC });
const validator = createValidator(document);
const api = new StatefulOrderApiClient({ baseUrl: process.env.STATEFUL_API_BASE_URL });
const statefulApiBaseUrl = process.env.STATEFUL_API_BASE_URL;

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

test("stateful order validation and conflict responses match the OpenAPI contract", async () => {
  const invalid = await validate(api.createOrder("", 0));
  assert.equal(invalid.status, 400);

  const created = await validate(api.createOrder("demo-sku", 1));
  assert.equal(created.status, 201);
  const orderId = created.result.body.id;

  const cancelled = await validate(api.updateOrder(orderId, "cancelled"));
  assert.equal(cancelled.status, 200);
  assert.equal(cancelled.result.body.status, "cancelled");

  const repeated = await validate(api.updateOrder(orderId, "cancelled"));
  assert.equal(repeated.status, 200);
  assert.equal(repeated.result.body.status, "cancelled");

  const conflict = await validate(api.updateOrder(orderId, "confirmed"));
  assert.equal(conflict.status, 409);
  assert.match(conflict.result.body.message, /Cannot change order/);

  const deleted = await validate(api.deleteOrder(orderId));
  assert.equal(deleted.status, 204);
});

test("Reject an unsupported method on the health endpoint", async () => {
  const request = new Request(new URL("/healthz", statefulApiBaseUrl), { method: "POST" });
  const response = await fetch(request);

  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "GET");
  assert.equal(typeof (await response.json()).message, "string");
});
