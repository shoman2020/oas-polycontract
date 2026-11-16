import http from "node:http";
import { pathToFileURL } from "node:url";

const DEFAULT_PORT = 8080;
const DEFAULT_INVENTORY_URL = "http://localhost:8081";
const DEFAULT_REQUEST_TIMEOUT_MS = 5000;

function sendJson(response, status, body, headers = {}) {
  response.writeHead(status, {
    "Content-Type": "application/json",
    ...headers,
  });
  response.end(JSON.stringify(body));
}

function matchRoute(pathname) {
  if (pathname === "/healthz") return { name: "health" };

  const product = pathname.match(/^\/products\/([^/]+)$/);
  return product ? { name: "product", encodedSku: product[1] } : null;
}

async function handleRequest(request, response, dependencies) {
  const url = new URL(request.url ?? "/", "http://localhost");
  const route = matchRoute(url.pathname);

  if (!route) {
    sendJson(response, 404, { message: "Not found" });
    return;
  }

  if (request.method !== "GET") {
    sendJson(response, 405, { message: "Method not allowed" }, { Allow: "GET" });
    return;
  }

  if (route.name === "health") {
    sendJson(response, 200, { status: "ok" });
    return;
  }

  let sku;
  try {
    sku = decodeURIComponent(route.encodedSku);
  } catch {
    sendJson(response, 400, { message: "Invalid SKU encoding" });
    return;
  }

  try {
    const upstream = await dependencies.fetchImpl(
      `${dependencies.inventoryUrl}/inventory/${encodeURIComponent(sku)}`,
      { signal: AbortSignal.timeout(dependencies.requestTimeoutMs) },
    );

    if (!upstream.ok) {
      if (upstream.status >= 500) {
        sendJson(response, 502, { message: "Inventory service unavailable" });
      } else {
        sendJson(response, 404, { message: `No inventory record for ${sku}` });
      }
      return;
    }

    const inventory = await upstream.json();
    sendJson(response, 200, {
      sku: inventory.sku,
      available: inventory.available,
    });
  } catch {
    sendJson(response, 502, { message: "Inventory service unavailable" });
  }
}

export function createApp({
  inventoryUrl = process.env.INVENTORY_URL ?? DEFAULT_INVENTORY_URL,
  fetchImpl = fetch,
  requestTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
} = {}) {
  const dependencies = { inventoryUrl, fetchImpl, requestTimeoutMs };
  return http.createServer((request, response) => {
    void handleRequest(request, response, dependencies).catch(() => {
      if (!response.headersSent) {
        sendJson(response, 500, { message: "Internal server error" });
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
  createApp().listen(port, () => {
    console.log(`demo app listening on ${port}`);
  });
}

