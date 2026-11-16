import { expect, test } from "@playwright/test";
import { ProductApiClient } from "./api-client.mjs";
import { validateResponse } from "./openapi-validator.mjs";

test("consumer uses the Specmatic Smart Mock contract", async ({ request }) => {
  const sku = "demo-sku";
  const response = await new ProductApiClient(request).getProduct(sku);
  const result = await validateResponse(response, `/products/${sku}`);

  expect(result.ok, JSON.stringify(result)).toBe(true);
  if (!result.ok) return;
  expect(result.body).toMatchObject({ sku, available: 7 });
  console.log(`Consumer contract passed: GET /products/${sku} -> ${response.status()} from Specmatic Smart Mock`);
});

