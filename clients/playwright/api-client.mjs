export class ProductApiClient {
  #request;

  constructor(apiRequestContext) {
    if (typeof apiRequestContext?.get !== "function") {
      throw new TypeError("A Playwright APIRequestContext is required");
    }
    this.#request = apiRequestContext;
  }

  getProduct(sku) {
    return this.#request.get(`/products/${encodeURIComponent(sku)}`, { timeout: 10_000 });
  }
}

