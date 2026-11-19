import { HttpApiClient, type ApiResponse, type ProductApi } from "./http-api-client.js";

export type ProductApiResponse = ApiResponse;

export class ProductApiClient extends HttpApiClient implements ProductApi {
  constructor(baseUrl: string, fetchImpl: typeof fetch = globalThis.fetch, timeoutMs = 10_000) {
    super(baseUrl, fetchImpl, timeoutMs);
  }

  getProduct(sku: string): Promise<ProductApiResponse> {
    return this.send(`/products/${encodeURIComponent(sku)}`);
  }

  getProductPath(path: string): Promise<ProductApiResponse> {
    return this.send(path);
  }
}

