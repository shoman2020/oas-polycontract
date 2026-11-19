import http from "node:http";

const server = http.createServer((request, response) => {
  const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
  response.setHeader("Content-Type", "application/json");

  if (request.method === "GET" && pathname === "/healthz") {
    response.writeHead(200).end(JSON.stringify({ status: "ok" }));
    return;
  }

  if (request.method === "GET" && /^\/products\/[^/]+$/.test(pathname)) {
    const sku = decodeURIComponent(pathname.slice("/products/".length));
    response.writeHead(200).end(JSON.stringify({ sku, available: "7" }));
    return;
  }

  response.writeHead(404).end(JSON.stringify({ message: "Not found" }));
});

server.listen(8080, "0.0.0.0", () => {
  console.log("deliberately invalid Product provider ready");
});
