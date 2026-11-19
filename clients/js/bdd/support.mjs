import assert from "node:assert/strict";
import { Given } from "@cucumber/cucumber";
import { createValidator } from "@oaverify/core";
import { loadSpecSync } from "@oaverify/syntax";

const validators = new Map();

function validatorFor(specPath) {
  let validator = validators.get(specPath);
  if (!validator) {
    const { document } = loadSpecSync({ entry: specPath });
    validator = createValidator(document);
    validators.set(specPath, validator);
  }
  return validator;
}

export async function validateResponse(world, specPath) {
  const result = await validatorFor(specPath).validateFetchResponse(world.request, world.response);
  assert.equal(result.ok, true, JSON.stringify(result));
  world.body = result.body;
  return result.body;
}

Given("the acceptance data:", function (data) {
  this.scenario = JSON.parse(data);
});
