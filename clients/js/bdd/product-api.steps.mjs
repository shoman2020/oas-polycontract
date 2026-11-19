import assert from "node:assert/strict";
import { Given, Then, When } from "@cucumber/cucumber";
import { ProductApiClient } from "../api-client.mjs";
import { validateResponse } from "./support.mjs";

const productClient = () => new ProductApiClient({ baseUrl: process.env.API_BASE_URL });
const productSpec = () => process.env.OPENAPI_SPEC;

Given("Inventory has {int} units for {string}", function (available, sku) {
  this.expectedAvailability = this.scenario.available ?? available;
  this.sku = this.scenario.sku ?? sku;
});

Given("Inventory has no record for {string}", function (sku) {
  this.sku = this.scenario.sku ?? sku;
});

Given("Inventory returns an invalid record for {string}", function (sku) {
  this.sku = this.scenario.sku ?? sku;
});

When("a client requests that product", async function () {
  const result = await productClient().getProduct(this.sku);
  this.request = result.request;
  this.response = result.response;
});

When("a client requests a product with invalid UTF-8 path encoding", async function () {
  this.request = new Request(new URL(this.scenario.path, process.env.API_BASE_URL));
  this.response = await fetch(this.request);
});

Then("the response is {int} and matches the Product contract", async function (status) {
  const body = await validateResponse(this, productSpec());
  assert.equal(this.response.status, this.scenario.expectedStatus ?? status);
  assert.equal(body.sku, this.sku);
  assert.equal(body.available, this.expectedAvailability);
});

Then("the response is {int} and explains that the inventory record is missing", async function (status) {
  const body = await validateResponse(this, productSpec());
  assert.equal(this.response.status, this.scenario.expectedStatus ?? status);
  assert.deepEqual(body, { message: this.scenario.expectedMessage });
});

Then("the response is {int} and matches the Error contract", async function (status) {
  const body = await validateResponse(this, productSpec());
  assert.equal(this.response.status, this.scenario.expectedStatus ?? status);
  assert.equal(body.message, this.scenario.expectedMessage);
});

Then("the response is {int} and hides the upstream payload", async function (status) {
  const body = await validateResponse(this, productSpec());
  assert.equal(this.response.status, this.scenario.expectedStatus ?? status);
  assert.deepEqual(body, { message: this.scenario.expectedMessage });
  assert.equal("available" in body, false);
});
