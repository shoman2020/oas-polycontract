import assert from "node:assert/strict";
import test from "node:test";
import { createStatefulApp } from "./server.mjs";

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

async function createOrder(baseUrl, body = { sku: "demo-sku", quantity: 2 }) {
  return fetch(`${baseUrl}/orders`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function updateOrder(baseUrl, orderId, status) {
  return fetch(`${baseUrl}/orders/${encodeURIComponent(orderId)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status }),
  });
}

test("Create and confirm an order idempotently", async () => {
  await withServer(createStatefulApp(), async (baseUrl) => {
    const created = await createOrder(baseUrl);
    assert.equal(created.status, 201);
    const order = await created.json();

    const first = await updateOrder(baseUrl, order.id, "confirmed");
    const repeated = await updateOrder(baseUrl, order.id, "confirmed");

    assert.equal(first.status, 200);
    assert.equal(repeated.status, 200);
    assert.deepEqual(await repeated.json(), { ...order, status: "confirmed" });
  });
});

test("Reject an invalid order", async () => {
  await withServer(createStatefulApp(), async (baseUrl) => {
    const response = await createOrder(baseUrl, { sku: "", quantity: 0 });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { message: "sku and quantity are invalid" });
  });
});

test("Reject an illegal state transition", async () => {
  await withServer(createStatefulApp(), async (baseUrl) => {
    const created = await createOrder(baseUrl);
    const order = await created.json();
    await updateOrder(baseUrl, order.id, "cancelled");

    const conflict = await updateOrder(baseUrl, order.id, "confirmed");
    assert.equal(conflict.status, 409);
    assert.match((await conflict.json()).message, /Cannot change order/);

    const unchanged = await fetch(`${baseUrl}/orders/${encodeURIComponent(order.id)}`);
    assert.equal(unchanged.status, 200);
    assert.equal((await unchanged.json()).status, "cancelled");
  });
});

test("Reject an unsupported method", async () => {
  await withServer(createStatefulApp(), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/healthz`, { method: "POST" });
    assert.equal(response.status, 405);
    assert.equal(response.headers.get("allow"), "GET");
    assert.deepEqual(await response.json(), { message: "Method not allowed" });
  });
});
