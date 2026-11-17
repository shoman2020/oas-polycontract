export interface StatefulApiResponse {
  request: Request;
  response: Response;
}

export class StatefulOrderApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly fetchImpl: typeof fetch = globalThis.fetch,
    private readonly timeoutMs = 10_000,
  ) {
    if (!baseUrl) throw new Error("STATEFUL_API_BASE_URL is required");
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

  private async send(path: string, method: string, payload?: object): Promise<StatefulApiResponse> {
    const url = new URL(path, this.baseUrl);
    const request = new Request(url, {
      method,
      headers: payload ? { "content-type": "application/json" } : undefined,
      body: payload ? JSON.stringify(payload) : undefined,
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    const response = await this.fetchImpl(request);
    return { request, response };
  }
}
