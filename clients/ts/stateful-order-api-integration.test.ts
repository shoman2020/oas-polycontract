import { createValidator } from "@oaverify/core";
import { loadSpecSync } from "@oaverify/syntax";
import { describe, expect, it } from "vitest";
import { StatefulOrderApiClient, type StatefulApiResponse } from "./order-api-client.js";
import type { StatefulOrderApi } from "./http-api-client.js";
import { acceptanceCase, acceptanceCases } from "./feature-cases.js";

interface OrderResponse {
  id: string;
  status: "created" | "confirmed" | "cancelled";
  message?: string;
}

const { document } = loadSpecSync({ entry: process.env.STATEFUL_OPENAPI_SPEC! });
const validator = createValidator(document);
const createOrderApi = (): StatefulOrderApi => new StatefulOrderApiClient(process.env.STATEFUL_API_BASE_URL!);

async function validate(response: Promise<StatefulApiResponse>) {
  const { request, response: httpResponse } = await response;
  const result = await validator.validateFetchResponse<OrderResponse>(request, httpResponse);
  expect(result.ok, JSON.stringify(result)).toBe(true);
  if (!result.ok) throw new Error("Stateful API response does not match OAS");
  return { body: result.body, status: httpResponse.status };
}

describe("stateful order API contract", () => {
  it("validates linked create, read, update, delete, and not-found responses", async () => {
    const api = createOrderApi();
    const scenario = acceptanceCase("order.confirm");
    const created = await validate(api.createOrder(scenario.sku!, scenario.quantity!));
    expect(created.status).toBe(201);
    expect(created.body.status).toBe("created");

    const fetched = await validate(api.getOrder(created.body.id));
    expect(fetched.status).toBe(200);
    expect(fetched.body.id).toBe(created.body.id);

    for (let attempt = 0; attempt < scenario.repeatCount!; attempt += 1) {
      const updated = await validate(api.updateOrder(created.body.id, scenario.status!));
      expect(updated.status).toBe(scenario.expectedStatus);
      expect(updated.body.status).toBe(scenario.status);
    }

    const deleted = await validate(api.deleteOrder(created.body.id));
    expect(deleted.status).toBe(204);

    const missing = await validate(api.getOrder(created.body.id));
    expect(missing.status).toBe(404);
    expect(missing.body.message).toBe("Order not found");
    console.log("Stateful OAS validation passed: create -> read -> confirm -> delete -> 404");
  });

  for (const scenario of acceptanceCases("order").filter(({ caseId }) => caseId !== "order.confirm")) {
    it(scenario.scenario, async () => {
      const api = createOrderApi();
      if (scenario.caseId === "order.invalid") {
        const result = await validate(api.createOrder(scenario.sku!, scenario.quantity!));
        expect(result.status).toBe(scenario.expectedStatus);
        return;
      }

      if (scenario.caseId === "order.illegal-transition") {
        const created = await validate(api.createOrder(scenario.sku!, scenario.quantity!));
        expect(created.status).toBe(201);
        const orderId = created.body.id;
        for (let attempt = 0; attempt < scenario.repeatCount!; attempt += 1) {
          const cancelled = await validate(api.updateOrder(orderId, scenario.initialStatus!));
          expect(cancelled.status).toBe(200);
          expect(cancelled.body.status).toBe(scenario.persistedStatus);
        }

        const conflict = await validate(api.updateOrder(orderId, scenario.requestedStatus!));
        expect(conflict.status).toBe(scenario.expectedStatus);
        expect(conflict.body.message).toMatch(/Cannot change order/);

        const unchanged = await validate(api.getOrder(orderId));
        expect(unchanged.body.status).toBe(scenario.persistedStatus);
        expect((await validate(api.deleteOrder(orderId))).status).toBe(204);
        return;
      }

      const request = new Request(new URL(scenario.path!, process.env.STATEFUL_API_BASE_URL!), {
        method: scenario.method,
      });
      const response = await fetch(request);
      expect(response.status).toBe(scenario.expectedStatus);
      expect(response.headers.get("allow")).toBe(scenario.allowedMethod);
      expect(typeof (await response.json()).message).toBe("string");
    });
  }
});
