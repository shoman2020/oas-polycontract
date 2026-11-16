export class ProductApiClient {
  #baseUrl;
  #fetchImpl;
  #timeoutMs;

  constructor({ baseUrl, fetchImpl = globalThis.fetch, timeoutMs = 10_000 }) {
    if (!baseUrl) throw new Error("API_BASE_URL is required");
    if (typeof fetchImpl !== "function") throw new TypeError("fetchImpl must be a function");
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new RangeError("timeoutMs must be positive");
    const parsedBaseUrl = new URL(baseUrl);
    if (!["http:", "https:"].includes(parsedBaseUrl.protocol)) {
      throw new TypeError("API_BASE_URL must use HTTP or HTTPS");
    }
    this.#baseUrl = parsedBaseUrl;
    this.#fetchImpl = fetchImpl;
    this.#timeoutMs = timeoutMs;
  }

  async getProduct(sku) {
    const url = new URL(`/products/${encodeURIComponent(sku)}`, this.#baseUrl);
    const request = new Request(url, { signal: AbortSignal.timeout(this.#timeoutMs) });
    const response = await this.#fetchImpl(request);
    return { request, response };
  }
}

