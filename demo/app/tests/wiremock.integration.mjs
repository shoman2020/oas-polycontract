import assert from "node:assert/strict";

const APP_URL = process.env.APP_URL ?? "http://localhost:8080";
const WIREMOCK_URL = process.env.WIREMOCK_URL ?? "http://localhost:8081";
const SKU = "demo-sku";

async function waitForOk(url, attempts = 20, delayMs = 500) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
    } catch {
      // not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function main() {
  await waitForOk(`${APP_URL}/healthz`);

  const productRes = await fetch(`${APP_URL}/products/${SKU}`);
  assert.equal(productRes.status, 200, "expected 200 from /products/{sku}");
  const product = await productRes.json();
  assert.equal(product.sku, SKU, "unexpected sku in app response");
  assert.equal(product.available, 7, "unexpected availability in app response");

  const missingRes = await fetch(`${APP_URL}/products/not-found-sku`);
  assert.equal(missingRes.status, 404, "expected an inventory miss to map to 404");
  assert.deepEqual(await missingRes.json(), { message: "No inventory record for not-found-sku" });

  const unavailableRes = await fetch(`${APP_URL}/products/unavailable-sku`);
  assert.equal(unavailableRes.status, 502, "expected a failed inventory dependency to map to 502");
  assert.deepEqual(await unavailableRes.json(), { message: "Inventory service unavailable" });

  const journalRes = await fetch(`${WIREMOCK_URL}/__admin/requests`);
  assert.equal(journalRes.status, 200, "expected 200 from WireMock request journal");
  const journal = await journalRes.json();
  const matched = (journal.requests ?? []).some(
    (entry) =>
      entry.request?.method === "GET" &&
      entry.request?.url === `/inventory/${SKU}`
  );
  assert.ok(matched, "expected WireMock journal to contain the app's inventory call");

  console.log("wiremock integration checks passed: 200, 404, and 502");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
