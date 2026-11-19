export class HttpApiClient {
  #baseUrl;
  #fetchImpl;
  #timeoutMs;

  constructor({ baseUrl, fetchImpl = globalThis.fetch, timeoutMs = 10_000 }) {
    if (!baseUrl) throw new Error("baseUrl is required");
    if (typeof fetchImpl !== "function") throw new TypeError("fetchImpl must be a function");
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new RangeError("timeoutMs must be positive");

    this.#baseUrl = new URL(baseUrl);
    if (!["http:", "https:"].includes(this.#baseUrl.protocol)) {
      throw new TypeError("baseUrl must use HTTP or HTTPS");
    }
    this.#fetchImpl = fetchImpl;
    this.#timeoutMs = timeoutMs;
  }

  async _send(path, method = "GET", payload) {
    const request = new Request(new URL(path, this.#baseUrl), {
      method,
      headers: payload ? { "content-type": "application/json" } : undefined,
      body: payload ? JSON.stringify(payload) : undefined,
      signal: AbortSignal.timeout(this.#timeoutMs),
    });
    const response = await this.#fetchImpl(request);
    return { request, response };
  }
}
