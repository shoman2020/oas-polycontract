import http from "node:http";

const PORT = process.env.PORT ?? "8080";
const INVENTORY_URL = process.env.INVENTORY_URL ?? "http://localhost:8081";

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(payload);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "GET" && url.pathname === "/healthz") {
    sendJson(res, 200, { status: "ok" });
    return;
  }

  const match = url.pathname.match(/^\/products\/([^/]+)$/);
  if (req.method === "GET" && match) {
    const sku = decodeURIComponent(match[1]);
    try {
      const upstream = await fetch(
        `${INVENTORY_URL}/inventory/${encodeURIComponent(sku)}`
      );
      if (!upstream.ok) {
        sendJson(res, 404, { message: `No inventory record for ${sku}` });
        return;
      }
      const inventory = await upstream.json();
      sendJson(res, 200, { sku: inventory.sku, available: inventory.available });
    } catch {
      sendJson(res, 502, { message: "Inventory service unavailable" });
    }
    return;
  }

  sendJson(res, 404, { message: "Not found" });
});

server.listen(Number(PORT), () => {
  console.log(`demo app listening on ${PORT}, inventory at ${INVENTORY_URL}`);
});
