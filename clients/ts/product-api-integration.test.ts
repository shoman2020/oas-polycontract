import { createValidator } from "@oaverify/core";
import { loadSpecSync } from "@oaverify/syntax";
import { describe, expect, it } from "vitest";
import { ProductApiClient } from "./api-client.js";

const { document } = loadSpecSync({ entry: process.env.OPENAPI_SPEC! });
const validator = createValidator(document);
const api = new ProductApiClient(process.env.API_BASE_URL!);

describe("product API contract", () => {
  it("validates the response against the OAS and checks the business result", async () => {
    const { request, response } = await api.getProduct("demo-sku");
    const result = await validator.validateFetchResponse<{ sku: string; available: number }>(request, response);

    expect(result.ok, JSON.stringify(result)).toBe(true);
    if (!result.ok) return;
    expect(result.body).toMatchObject({ sku: "demo-sku", available: 7 });
    console.log(`OAS validation passed: GET /products/demo-sku -> ${response.status}`);
  });
});

