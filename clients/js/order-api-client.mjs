import { HttpApiClient } from "./http-api-client.mjs";

export class StatefulOrderApiClient extends HttpApiClient {

  createOrder(sku, quantity) {
    return this._send("/orders", "POST", { sku, quantity });
  }

  getOrder(orderId) {
    return this._send(`/orders/${encodeURIComponent(orderId)}`);
  }

  updateOrder(orderId, status) {
    return this._send(`/orders/${encodeURIComponent(orderId)}`, "PATCH", { status });
  }

  deleteOrder(orderId) {
    return this._send(`/orders/${encodeURIComponent(orderId)}`, "DELETE");
  }
}
