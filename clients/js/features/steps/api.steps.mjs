import assert from "node:assert/strict";
import {
  Given,
  Then,
  When,
} from "@cucumber/cucumber";
import { createValidator } from "@oaverify/core";
import { loadSpecSync } from "@oaverify/syntax";
import { ProductApiClient } from "../../api-client.mjs";
import { StatefulOrderApiClient } from "../../order-api-client.mjs";

const validatorCache = new Map();

function validatorFor(specPath) {
  let validator = validatorCache.get(specPath);
  if (!validator) {
    const { document } = loadSpecSync({ entry: specPath });
    validator = createValidator(document);
    validatorCache.set(specPath, validator);
  }
  return validator;
}

async function validateResponse(world, specPath) {
  const result = await validatorFor(specPath).validateFetchResponse(world.request, world.response);
  assert.equal(result.ok, true, JSON.stringify(result));
  world.body = result.body;
  return result.body;
}

function productClient() {
  return new ProductApiClient({ baseUrl: process.env.API_BASE_URL });
}

function orderClient() {
  return new StatefulOrderApiClient({ baseUrl: process.env.STATEFUL_API_BASE_URL });
}

function productSpec() {
  return process.env.OPENAPI_SPEC;
}

function orderSpec() {
  return process.env.STATEFUL_OPENAPI_SPEC;
}

Given("Inventory has {int} units for {string}", function (available, sku) {
  this.expectedAvailability = available;
  this.sku = sku;
});

Given("Inventory has no record for {string}", function (sku) {
  this.sku = sku;
});

Given("Inventory returns an invalid record for {string}", function (sku) {
  this.sku = sku;
});

When("a client requests that product", async function () {
  const result = await productClient().getProduct(this.sku);
  this.request = result.request;
  this.response = result.response;
});

When("a client requests a product with malformed percent encoding", async function () {
  this.request = new Request(new URL("/products/%E0%A4%A", process.env.API_BASE_URL));
  this.response = await fetch(this.request);
});

Then("the response is {int} and matches the Product contract", async function (status) {
  const body = await validateResponse(this, productSpec());
  assert.equal(this.response.status, status);
  assert.equal(body.sku, this.sku);
  assert.equal(body.available, this.expectedAvailability);
});

Then("the response is {int} and explains that the inventory record is missing", async function (status) {
  const body = await validateResponse(this, productSpec());
  assert.equal(this.response.status, status);
  assert.deepEqual(body, { message: `No inventory record for ${this.sku}` });
});

Then("the response is {int} and matches the Error contract", async function (status) {
  const body = await validateResponse(this, productSpec());
  assert.equal(this.response.status, status);
  assert.equal(typeof body.message, "string");
});

Then("the response is {int} and matches the Order error contract", async function (status) {
  const body = await validateResponse(this, orderSpec());
  assert.equal(this.response.status, status);
  assert.equal(typeof body.message, "string");
});

Then("the response is {int} and hides the upstream payload", async function (status) {
  const body = await validateResponse(this, productSpec());
  assert.equal(this.response.status, status);
  assert.deepEqual(body, { message: "Inventory service unavailable" });
  assert.equal("available" in body, false);
});

Given("the Order API is ready", async function () {
  this.client = orderClient();
  const result = await fetch(`${process.env.STATEFUL_API_BASE_URL}/healthz`);
  assert.equal(result.status, 200);
});

When("a client creates an order for {int} units of {string}", async function (quantity, sku) {
  this.client = orderClient();
  const result = await this.client.createOrder(sku, quantity);
  this.request = result.request;
  this.response = result.response;
  assert.equal(this.response.status, 201);
  this.order = await validateResponse(this, orderSpec());
});

When("the client sets the status to {string} twice", async function (status) {
  this.updates = [];
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const result = await this.client.updateOrder(this.order.id, status);
    this.updates.push(result);
  }
});

Then("both updates return {int} with status {string}", async function (status, expectedStatus) {
  for (const update of this.updates) {
    const body = await validateResponse(update, orderSpec());
    assert.equal(update.response.status, status);
    assert.equal(body.status, expectedStatus);
    assert.equal(body.id, this.order.id);
  }
});

When("a client creates an order with SKU {string} and quantity {int}", async function (sku, quantity) {
  const result = await orderClient().createOrder(sku, quantity);
  this.request = result.request;
  this.response = result.response;
});

Given("an order for {int} unit of {string} has been cancelled", async function (quantity, sku) {
  this.client = orderClient();
  const created = await this.client.createOrder(sku, quantity);
  assert.equal(created.response.status, 201);
  const order = await validateResponse(created, orderSpec());
  const cancelled = await this.client.updateOrder(order.id, "cancelled");
  assert.equal(cancelled.response.status, 200);
  await validateResponse(cancelled, orderSpec());
  this.order = order;
});

When("a client changes its status to {string}", async function (status) {
  const result = await this.client.updateOrder(this.order.id, status);
  this.request = result.request;
  this.response = result.response;
});

Then("the response is {int} and the order state is unchanged", async function (status) {
  const body = await validateResponse(this, orderSpec());
  assert.equal(this.response.status, status);
  assert.match(body.message, /Cannot change order/);

  const unchanged = await this.client.getOrder(this.order.id);
  const unchangedBody = await validateResponse(unchanged, orderSpec());
  assert.equal(unchanged.response.status, 200);
  assert.equal(unchangedBody.status, "cancelled");
});

When("a client posts to the Order health endpoint", async function () {
  this.request = new Request(new URL("/healthz", process.env.STATEFUL_API_BASE_URL), { method: "POST" });
  this.response = await fetch(this.request);
});

Then("the response is {int} and allows {string}", async function (status, allowedMethod) {
  const body = await this.response.json();
  assert.equal(this.response.status, status);
  assert.equal(this.response.headers.get("allow"), allowedMethod);
  assert.equal(typeof body.message, "string");
});
