import { expect, test } from "@playwright/test";
import { ProductApiClient } from "./api-client.mjs";
import { validateResponse } from "./openapi-validator.mjs";

test("Playwright API response from the provider matches the OpenAPI contract", async ({ request }) => {
  const sku = "demo-sku";
  const apiResponse = await new ProductApiClient(request).getProduct(sku);
  const result = await validateResponse(apiResponse, `/products/${sku}`);

  expect(result.ok, JSON.stringify(result)).toBe(true);
  if (!result.ok) return;
  expect(result.body).toMatchObject({ sku, available: 7 });
  console.log(`Provider integration passed: GET /products/${sku} -> ${apiResponse.status()}`);
});

