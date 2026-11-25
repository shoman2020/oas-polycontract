import { HttpApiClient } from "./http-api-client.mjs";

export class StatefulOrderApiClient extends HttpApiClient {
  async createOrder(sku, quantity) {
    return this._send("/orders", "POST", { sku, quantity });
  }

  async getOrder(orderId) {
    return this._send(`/orders/${encodeURIComponent(orderId)}`);
  }

  async updateOrder(orderId, status) {
    return this._send(`/orders/${encodeURIComponent(orderId)}`, "PATCH", { status });
  }

  async deleteOrder(orderId) {
    return this._send(`/orders/${encodeURIComponent(orderId)}`, "DELETE");
  }
}
