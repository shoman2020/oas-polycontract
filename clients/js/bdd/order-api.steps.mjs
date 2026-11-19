import assert from "node:assert/strict";
import { Given, Then, When } from "@cucumber/cucumber";
import { StatefulOrderApiClient } from "../order-api-client.mjs";
import { validateResponse } from "./support.mjs";

const orderClient = () => new StatefulOrderApiClient({ baseUrl: process.env.STATEFUL_API_BASE_URL });
const orderSpec = () => process.env.STATEFUL_OPENAPI_SPEC;

Given("the Order API is ready", async function () {
  this.client = orderClient();
  const response = await fetch(`${process.env.STATEFUL_API_BASE_URL}/healthz`);
  assert.equal(response.status, 200);
});

When("a client creates an order for {int} units of {string}", async function (quantity, sku) {
  this.client = orderClient();
  const result = await this.client.createOrder(this.scenario.sku ?? sku, this.scenario.quantity ?? quantity);
  this.request = result.request;
  this.response = result.response;
  assert.equal(this.response.status, 201);
  this.order = await validateResponse(this, orderSpec());
});

When("the client sets the status to {string} twice", async function (status) {
  this.updates = [];
  for (let attempt = 0; attempt < this.scenario.repeatCount; attempt += 1) {
    const result = await this.client.updateOrder(this.order.id, this.scenario.status ?? status);
    this.updates.push(result);
  }
});

Then("both updates return {int} with status {string}", async function (status, expectedStatus) {
  for (const update of this.updates) {
    const body = await validateResponse(update, orderSpec());
    assert.equal(update.response.status, this.scenario.expectedStatus ?? status);
    assert.equal(body.status, this.scenario.status ?? expectedStatus);
    assert.equal(body.id, this.order.id);
  }
});

When("a client creates an order with SKU {string} and quantity {int}", async function (sku, quantity) {
  const result = await orderClient().createOrder(this.scenario.sku ?? sku, this.scenario.quantity ?? quantity);
  this.request = result.request;
  this.response = result.response;
});

Given("an order for {int} unit of {string} has been cancelled idempotently", async function (quantity, sku) {
  this.client = orderClient();
  const created = await this.client.createOrder(this.scenario.sku ?? sku, this.scenario.quantity ?? quantity);
  assert.equal(created.response.status, 201);
  const order = await validateResponse(created, orderSpec());
  for (let attempt = 0; attempt < this.scenario.repeatCount; attempt += 1) {
    const cancelled = await this.client.updateOrder(order.id, this.scenario.initialStatus ?? "cancelled");
    assert.equal(cancelled.response.status, 200);
    const body = await validateResponse(cancelled, orderSpec());
    assert.equal(body.status, this.scenario.persistedStatus);
  }
  this.order = order;
});

When("a client changes its status to {string}", async function (status) {
  const result = await this.client.updateOrder(this.order.id, this.scenario.requestedStatus ?? status);
  this.request = result.request;
  this.response = result.response;
});

Then("the response is {int} and the order state is unchanged", async function (status) {
  const body = await validateResponse(this, orderSpec());
  assert.equal(this.response.status, this.scenario.expectedStatus ?? status);
  assert.match(body.message, /Cannot change order/);

  const unchanged = await this.client.getOrder(this.order.id);
  const unchangedBody = await validateResponse(unchanged, orderSpec());
  assert.equal(unchanged.response.status, 200);
  assert.equal(unchangedBody.status, this.scenario.persistedStatus);
});

When("a client posts to the Order health endpoint", async function () {
  this.request = new Request(new URL(this.scenario.path, process.env.STATEFUL_API_BASE_URL), {
    method: this.scenario.method,
  });
  this.response = await fetch(this.request);
});

Then("the response is {int} and allows {string}", async function (status, allowedMethod) {
  const body = await this.response.json();
  assert.equal(this.response.status, this.scenario.expectedStatus ?? status);
  assert.equal(this.response.headers.get("allow"), this.scenario.allowedMethod ?? allowedMethod);
  assert.equal(typeof body.message, "string");
});

Then("the response is {int} and matches the Order error contract", async function (status) {
  const body = await validateResponse(this, orderSpec());
  assert.equal(this.response.status, this.scenario.expectedStatus ?? status);
  assert.equal(typeof body.message, "string");
});
