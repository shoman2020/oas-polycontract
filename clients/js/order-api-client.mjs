export class StatefulOrderApiClient {
  #baseUrl;
  #fetchImpl;
  #timeoutMs;

  constructor({ baseUrl, fetchImpl = globalThis.fetch, timeoutMs = 10_000 }) {
    if (!baseUrl) throw new Error("STATEFUL_API_BASE_URL is required");
    if (typeof fetchImpl !== "function") throw new TypeError("fetchImpl must be a function");
    this.#baseUrl = new URL(baseUrl);
    this.#fetchImpl = fetchImpl;
    this.#timeoutMs = timeoutMs;
  }

  createOrder(sku, quantity) {
    return this.#send("/orders", "POST", { sku, quantity });
  }

  getOrder(orderId) {
    return this.#send(`/orders/${encodeURIComponent(orderId)}`, "GET");
  }

  updateOrder(orderId, status) {
    return this.#send(`/orders/${encodeURIComponent(orderId)}`, "PATCH", { status });
  }

  deleteOrder(orderId) {
    return this.#send(`/orders/${encodeURIComponent(orderId)}`, "DELETE");
  }

  async #send(path, method, payload) {
    const url = new URL(path, this.#baseUrl);
    const request = new Request(url, {
      method,
      headers: payload ? { "content-type": "application/json" } : undefined,
      body: payload ? JSON.stringify(payload) : undefined,
      signal: AbortSignal.timeout(this.#timeoutMs),
    });
    const response = await this.#fetchImpl(request);
    return { request, response };
  }
}
