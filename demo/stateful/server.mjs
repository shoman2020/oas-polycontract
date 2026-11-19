import http from "node:http";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";

const DEFAULT_PORT = 8082;
const MAX_REQUEST_BYTES = 64 * 1024;

class InMemoryOrderStore {
  #orders = new Map();
  create(input) {
    const order = {
      id: `order-${randomUUID()}`,
      sku: input.sku,
      quantity: input.quantity,
      status: "created",
    };
    this.#orders.set(order.id, order);
    return order;
  }

  get(orderId) {
    return this.#orders.get(orderId);
  }

  delete(orderId) {
    return this.#orders.delete(orderId);
  }
}

function sendJson(response, status, body, headers = {}) {
  response.writeHead(status, {
    "Content-Type": "application/json",
    ...headers,
  });
  response.end(JSON.stringify(body));
}

function sendError(response, status, message, headers = {}) {
  sendJson(response, status, { message }, headers);
}

function hasOnlyFields(value, allowedFields) {
  return value !== null
    && typeof value === "object"
    && !Array.isArray(value)
    && Object.keys(value).every((key) => allowedFields.includes(key));
}

async function readJson(request) {
  const chunks = [];
  let byteCount = 0;

  for await (const chunk of request) {
    byteCount += chunk.length;
    if (byteCount > MAX_REQUEST_BYTES) {
      throw new Error("Request body is too large");
    }
    chunks.push(chunk);
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function parseOrderId(pathname) {
  const match = pathname.match(/^\/orders\/([^/]+)$/);
  if (!match) return null;

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

async function handleRequest(request, response, orders) {
  const url = new URL(request.url ?? "/", "http://localhost");

  if (url.pathname === "/healthz") {
    if (request.method !== "GET") {
      sendError(response, 405, "Method not allowed", { Allow: "GET" });
      return;
    }
    sendJson(response, 200, { status: "ok" });
    return;
  }

  if (url.pathname === "/orders") {
    if (request.method !== "POST") {
      sendError(response, 405, "Method not allowed", { Allow: "POST" });
      return;
    }

    let input;
    try {
      input = await readJson(request);
    } catch {
      sendError(response, 400, "Request body must be valid JSON under 64 KiB");
      return;
    }

    const skuLength = typeof input?.sku === "string" ? [...input.sku].length : 0;
    if (!hasOnlyFields(input, ["sku", "quantity"])
      || skuLength < 1 || skuLength > 64
      || !Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 100) {
      sendError(response, 400, "sku and quantity are invalid");
      return;
    }

    const order = orders.create(input);
    sendJson(response, 201, order, {
      Location: `/orders/${encodeURIComponent(order.id)}`,
    });
    return;
  }

  const orderId = parseOrderId(url.pathname);
  if (orderId === null) {
    sendError(response, 404, "Order not found");
    return;
  }

  const order = orders.get(orderId);
  if (request.method === "GET") {
    if (!order) {
      sendError(response, 404, "Order not found");
      return;
    }
    sendJson(response, 200, order);
    return;
  }

  if (request.method === "PATCH") {
    if (!order) {
      sendError(response, 404, "Order not found");
      return;
    }

    let input;
    try {
      input = await readJson(request);
    } catch {
      sendError(response, 400, "Request body must be valid JSON under 64 KiB");
      return;
    }

    if (!hasOnlyFields(input, ["status"])
      || !["confirmed", "cancelled"].includes(input.status)) {
      sendError(response, 400, "status must be confirmed or cancelled");
      return;
    }

    const allowedTransitions = {
      created: ["confirmed", "cancelled"],
      confirmed: ["cancelled"],
      cancelled: [],
    };
    if (input.status !== order.status && !allowedTransitions[order.status].includes(input.status)) {
      sendError(response, 409, `Cannot change order from ${order.status} to ${input.status}`);
      return;
    }

    order.status = input.status;
    sendJson(response, 200, order);
    return;
  }

  if (request.method === "DELETE") {
    if (!order) {
      sendError(response, 404, "Order not found");
      return;
    }
    orders.delete(orderId);
    response.writeHead(204);
    response.end();
    return;
  }

  sendError(response, 405, "Method not allowed", { Allow: "GET, PATCH, DELETE" });
}

export function createStatefulApp({ orderStore = new InMemoryOrderStore() } = {}) {
  return http.createServer((request, response) => {
    void handleRequest(request, response, orderStore).catch(() => {
      if (!response.headersSent) {
        sendError(response, 500, "Internal server error");
      } else {
        response.destroy();
      }
    });
  });
}

const isMainModule = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  const port = Number(process.env.PORT ?? DEFAULT_PORT);
  createStatefulApp().listen(port, "0.0.0.0", () => {
    console.log(`stateful order example listening on ${port}`);
  });
}
