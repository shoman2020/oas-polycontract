import { HttpApiClient } from "./http-api-client.mjs";

export class ProductApiClient extends HttpApiClient {
  async getProduct(sku) {
    return this._send(`/products/${encodeURIComponent(sku)}`);
  }

  async getProductPath(path) {
    return this._send(path);
  }
}

