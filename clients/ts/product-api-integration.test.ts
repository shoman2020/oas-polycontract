import { createValidator } from "@oaverify/core";
import { loadSpecSync } from "@oaverify/syntax";
import { describe, expect, it } from "vitest";
import { ProductApiClient } from "./api-client.js";
import type { ProductApi } from "./http-api-client.js";
import { acceptanceCase, acceptanceCases } from "./feature-cases.js";

const { document } = loadSpecSync({ entry: process.env.OPENAPI_SPEC! });
const validator = createValidator(document);
const createProductApi = (): ProductApi => new ProductApiClient(process.env.API_BASE_URL!);

describe("product API contract", () => {
  it("validates the response against the OAS and checks the business result", async () => {
    const api = createProductApi();
    const scenario = acceptanceCase("product.available");
    const { request, response } = await api.getProduct(scenario.sku!);
    const result = await validator.validateFetchResponse<{ sku: string; available: number }>(request, response);

    expect(result.ok, JSON.stringify(result)).toBe(true);
    if (!result.ok) return;
    expect(response.status).toBe(scenario.expectedStatus);
    expect(result.body).toMatchObject({ sku: scenario.sku, available: scenario.available });
    console.log(`OAS validation passed: GET /products/demo-sku -> ${response.status}`);
  });

  for (const scenario of acceptanceCases("product").filter(({ caseId }) => caseId !== "product.available")) {
    it(scenario.scenario, async () => {
      const api = createProductApi();
      let request: Request;
      let response: Response;
      if (scenario.path) {
        ({ request, response } = await api.getProductPath(scenario.path));
      } else {
        ({ request, response } = await api.getProduct(scenario.sku!));
      }
      const result = await validator.validateFetchResponse<{ message: string }>(request, response);

      expect(result.ok, JSON.stringify(result)).toBe(true);
      if (!result.ok) return;
      expect(response.status).toBe(scenario.expectedStatus);
      expect(result.body.message).toBe(scenario.expectedMessage);
    });
  }
});

