import { HttpApiClient, type ApiResponse, type ProductApi } from "./http-api-client.js";

export type ProductApiResponse = ApiResponse;

export class ProductApiClient extends HttpApiClient implements ProductApi {
  constructor(baseUrl: string, fetchImpl: typeof fetch = globalThis.fetch, timeoutMs = 10_000) {
    super(baseUrl, fetchImpl, timeoutMs);
  }

  async getProduct(sku: string): Promise<ProductApiResponse> {
    try {
      return await this.send(`/products/${encodeURIComponent(sku)}`);
    } catch (error) {
      this.logger.error("Failed to get product", { sku, error });
      throw new Error(`Failed to get product for SKU: ${sku}`, { cause: error });
    }
  }

  async getProductPath(path: string): Promise<ProductApiResponse> {
    try {
      return await this.send(path);
    } catch (error) {
      this.logger.error("Failed to get product path", { path, error });
      throw new Error(`Failed to get product path: ${path}`, { cause: error });
    }
  }
}
