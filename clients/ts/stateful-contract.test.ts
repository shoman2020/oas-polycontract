import { createValidator } from "@oaverify/core";
import { loadSpecSync } from "@oaverify/syntax";
import { describe, expect, it } from "vitest";
import { StatefulOrderApiClient, type StatefulApiResponse } from "./order-api-client.js";

interface OrderResponse {
  id: string;
  status: "created" | "confirmed" | "cancelled";
  message?: string;
}

const { document } = loadSpecSync({ entry: process.env.STATEFUL_OPENAPI_SPEC! });
const validator = createValidator(document);
const api = new StatefulOrderApiClient(process.env.STATEFUL_API_BASE_URL!);

async function validate(response: Promise<StatefulApiResponse>) {
  const { request, response: httpResponse } = await response;
  const result = await validator.validateFetchResponse<OrderResponse>(request, httpResponse);
  expect(result.ok, JSON.stringify(result)).toBe(true);
  if (!result.ok) throw new Error("Stateful API response does not match OAS");
  return { body: result.body, status: httpResponse.status };
}

describe("stateful order API contract", () => {
  it("validates linked create, read, update, delete, and not-found responses", async () => {
    const created = await validate(api.createOrder("demo-sku", 2));
    expect(created.status).toBe(201);
    expect(created.body.status).toBe("created");

    const fetched = await validate(api.getOrder(created.body.id));
    expect(fetched.status).toBe(200);
    expect(fetched.body.id).toBe(created.body.id);

    const updated = await validate(api.updateOrder(created.body.id, "confirmed"));
    expect(updated.status).toBe(200);
    expect(updated.body.status).toBe("confirmed");

    const deleted = await validate(api.deleteOrder(created.body.id));
    expect(deleted.status).toBe(204);

    const missing = await validate(api.getOrder(created.body.id));
    expect(missing.status).toBe(404);
    expect(missing.body.message).toBe("Order not found");
    console.log("Stateful OAS validation passed: create -> read -> confirm -> delete -> 404");
  });
});
