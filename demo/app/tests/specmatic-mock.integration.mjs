import assert from "node:assert/strict";

const mockUrl = process.env.MOCK_URL ?? "http://localhost:9000";

async function getWithRetry(path) {
  let lastError;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      return await fetch(`${mockUrl}${path}`, { signal: AbortSignal.timeout(3000) });
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw lastError ?? new Error("Specmatic mock did not become ready");
}

const inline = await getWithRetry("/products/demo-sku");
assert.equal(inline.status, 200);
assert.deepEqual(await inline.json(), { sku: "demo-sku", available: 7 });
console.log("inline OAS example: GET /products/demo-sku -> 200, available=7");

const external = await getWithRetry("/products/vip-sku");
assert.equal(external.status, 200);
assert.deepEqual(await external.json(), { sku: "vip-sku", available: 25 });
console.log("external example: GET /products/vip-sku -> 200, available=25");

const generated = await getWithRetry("/products/not-in-examples");
assert.equal(generated.status, 200);
const fallback = await generated.json();
assert.ok(["mock-sku-blue", "mock-sku-green", "mock-sku-red"].includes(fallback.sku));
assert.ok([0, 1, 4, 9].includes(fallback.available));
console.log(`dictionary fallback: GET /products/not-in-examples -> 200, sku=${fallback.sku}, available=${fallback.available}`);
