export interface ProductApiResponse {
  request: Request;
  response: Response;
}

export class ProductApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly fetchImpl: typeof fetch = globalThis.fetch,
    private readonly timeoutMs = 10_000,
  ) {
    if (!baseUrl) throw new Error("API_BASE_URL is required");
  }

  async getProduct(sku: string): Promise<ProductApiResponse> {
    const url = new URL(`/products/${encodeURIComponent(sku)}`, this.baseUrl);
    const request = new Request(url, { signal: AbortSignal.timeout(this.timeoutMs) });
    const response = await this.fetchImpl(request);
    return { request, response };
  }
}

