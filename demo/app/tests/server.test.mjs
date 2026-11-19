import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../server.mjs";

async function withServer(app, operation) {
  app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    app.once("listening", resolve);
    app.once("error", reject);
  });

  const { port } = app.address();
  try {
    return await operation(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => {
      app.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

function jsonResponse(body, status = 200, contentType = "application/json") {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": contentType },
  });
}

test("Return availability for a known SKU", async () => {
  const app = createApp({
    fetchImpl: async () => jsonResponse({ sku: "demo-sku", available: 7 }),
  });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/products/demo-sku`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { sku: "demo-sku", available: 7 });
  });
});

test("Report an unknown SKU", async () => {
  const app = createApp({
    fetchImpl: async () => jsonResponse({ message: "missing" }, 404),
  });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/products/not-found-sku`);
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { message: "No inventory record for not-found-sku" });
  });
});

test("Reject a malformed SKU path", async () => {
  const app = createApp({
    fetchImpl: async () => {
      throw new Error("Inventory should not be called for malformed encoding");
    },
  });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/products/%E0%A4%A`);
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { message: "Invalid SKU encoding" });
  });
});

test("Reject invalid data from Inventory", async () => {
  const app = createApp({
    fetchImpl: async () => jsonResponse({ sku: "malformed-sku", available: "seven" }),
  });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/products/malformed-sku`);
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), { message: "Inventory service unavailable" });
  });
});
