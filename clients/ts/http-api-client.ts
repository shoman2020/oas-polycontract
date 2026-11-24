import { createLogger, type Logger } from "./logger.js";

export interface ApiResponse {
  request: Request;
  response: Response;
}

export interface ProductApi {
  getProduct(sku: string): Promise<ApiResponse>;
  getProductPath(path: string): Promise<ApiResponse>;
}

export interface StatefulOrderApi {
  createOrder(sku: string, quantity: number): Promise<ApiResponse>;
  getOrder(orderId: string): Promise<ApiResponse>;
  updateOrder(orderId: string, status: string): Promise<ApiResponse>;
  deleteOrder(orderId: string): Promise<ApiResponse>;
}

export abstract class HttpApiClient {
  private readonly baseUrl: URL;
  protected readonly logger: Logger;
  private readonly timeoutMs: number;

  protected constructor(
    baseUrl: string,
    private readonly fetchImpl: typeof fetch = globalThis.fetch,
    timeoutMs = 10_000,
  ) {
    if (!baseUrl) throw new Error("baseUrl is required");
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      throw new RangeError("timeoutMs must be a positive finite number");
    }
    this.baseUrl = new URL(baseUrl);
    if (!["http:", "https:"].includes(this.baseUrl.protocol)) {
      throw new TypeError("baseUrl must use HTTP or HTTPS");
    }
    this.timeoutMs = timeoutMs;
    this.logger = createLogger(this.constructor.name, { level: "info" });
  }

  protected async send(path: string, method = "GET", payload?: object): Promise<ApiResponse> {
    try {
      const request = new Request(new URL(path, this.baseUrl), {
        method,
        headers: payload ? { "content-type": "application/json" } : undefined,
        body: payload ? JSON.stringify(payload) : undefined,
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      const response = await this.fetchImpl(request);
      return { request, response };
    } catch (error) {
      this.logger.error(`${method} ${path} failed`, error);
      throw error;
    }
  }
}
