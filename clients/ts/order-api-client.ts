import { HttpApiClient, type ApiResponse, type StatefulOrderApi } from "./http-api-client.js";

export type StatefulApiResponse = ApiResponse;

export class StatefulOrderApiClient extends HttpApiClient implements StatefulOrderApi {
  constructor(baseUrl: string, fetchImpl: typeof fetch = globalThis.fetch, timeoutMs = 10_000) {
    super(baseUrl, fetchImpl, timeoutMs);
  }

  createOrder(sku: string, quantity: number): Promise<StatefulApiResponse> {
    return this.send("/orders", "POST", { sku, quantity });
  }

  getOrder(orderId: string): Promise<StatefulApiResponse> {
    return this.send(`/orders/${encodeURIComponent(orderId)}`, "GET");
  }

  updateOrder(orderId: string, status: string): Promise<StatefulApiResponse> {
    return this.send(`/orders/${encodeURIComponent(orderId)}`, "PATCH", { status });
  }

  deleteOrder(orderId: string): Promise<StatefulApiResponse> {
    return this.send(`/orders/${encodeURIComponent(orderId)}`, "DELETE");
  }
}
