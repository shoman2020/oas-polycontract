import { HttpApiClient, type ApiResponse, type StatefulOrderApi } from "./http-api-client.js";

export type StatefulApiResponse = ApiResponse;

export class StatefulOrderApiClient extends HttpApiClient implements StatefulOrderApi {
  constructor(baseUrl: string, fetchImpl: typeof fetch = globalThis.fetch, timeoutMs = 10_000) {
    super(baseUrl, fetchImpl, timeoutMs);
  }

  async createOrder(sku: string, quantity: number): Promise<StatefulApiResponse> {
    try {
      return await this.send("/orders", "POST", { sku, quantity });
    } catch (error) {
      this.logger.error("Failed to create order", { sku, quantity, error });
      throw new Error(`Failed to create order for SKU: ${sku}`, { cause: error });
    }
  }

  async getOrder(orderId: string): Promise<StatefulApiResponse> {
    try {
      return await this.send(`/orders/${encodeURIComponent(orderId)}`, "GET");
    } catch (error) {
      this.logger.error("Failed to get order", { orderId, error });
      throw new Error(`Failed to get order: ${orderId}`, { cause: error });
    }
  }

  async updateOrder(orderId: string, status: string): Promise<StatefulApiResponse> {
    try {
      return await this.send(`/orders/${encodeURIComponent(orderId)}`, "PATCH", { status });
    } catch (error) {
      this.logger.error("Failed to update order", { orderId, status, error });
      throw new Error(`Failed to update order: ${orderId}`, { cause: error });
    }
  }

  async deleteOrder(orderId: string): Promise<StatefulApiResponse> {
    try {
      return await this.send(`/orders/${encodeURIComponent(orderId)}`, "DELETE");
    } catch (error) {
      this.logger.error("Failed to delete order", { orderId, error });
      throw new Error(`Failed to delete order: ${orderId}`, { cause: error });
    }
  }
}
