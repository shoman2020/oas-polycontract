# Client suites

Seven language-native suites call the live Product API and stateful Order API. Playwright adds APIRequestContext tests without a browser. Each response is validated against its hand-edited OAS.

Run all examples with bash ./run.sh. CI uses the same entry point.

## Contract-based testing

| Test | Source | Target |
|---|---|---|
| Provider contract-based test | Specmatic provider verification | Live Product API at app:8080 |
| Consumer contract-based test | JavaScript and Playwright consumer suites | Specmatic Smart Mock at specmatic-mock:9000 |

Consumers check client expectations against responses generated from the provider OAS; they do not publish a separate CDC contract.

## API integration testing

These suites call live services, validate status, media type, and response schema, then check application behavior.

| Test | Source | Target |
|---|---|---|
| Product API integration test | Seven native suites and Playwright | Live Product API |
| Stateful API integration test | Seven native suites | Order API lifecycle: create, read, confirm, delete, verify 404 |
| Downstream service integration test | WireMock integration suite | Product API and WireMock request journal |

| Language | Validator |
|---|---|
| Rust | reqwest and jsonschema |
| Go | net/http and kin-openapi |
| Python | Requests and openapi-core |
| JavaScript | Fetch and @oaverify/core |
| TypeScript | Fetch and @oaverify/core |
| Java | REST Assured OpenAPI validator |
| C# | HttpClient and NJsonSchema |
| Playwright | APIRequestContext and @oaverify/core; Product API only |

## Test files

| Role | Implemented source |
|---|---|
| Consumer contract | [JavaScript](js/consumer-contract.test.mjs), [Playwright](playwright/consumer-contract.spec.mjs) |
| Product API integration | [Rust](rust/tests/api_integration_test.rs), [Go](go/product_api_integration_test.go), [Python](python/test_product_api_integration.py), [JavaScript](js/product-api-integration.test.mjs), [TypeScript](ts/product-api-integration.test.ts), [Java](java/src/test/java/nl/shiftleft/ProductApiIntegrationTest.java), [C#](csharp/ProductApiIntegrationTests.cs), [Playwright](playwright/product-api-integration.spec.mjs) |
| Stateful API integration | [Rust](rust/tests/api_integration_test.rs), [Go](go/stateful_order_api_integration_test.go), [Python](python/test_stateful_order_api_integration.py), [JavaScript](js/stateful-order-api-integration.test.mjs), [TypeScript](ts/stateful-order-api-integration.test.ts), [Java](java/src/test/java/nl/shiftleft/StatefulOrderApiIntegrationTest.java), [C#](csharp/StatefulOrderApiIntegrationTests.cs) |

Product tests request GET /products/demo-sku. Each native language also runs the linked Order lifecycle. The Product API is GET-only; Order state is isolated per run. The downstream suite checks the WireMock journal. Smart Mock fixtures and dictionary fallback use separate deterministic evaluations.

## Migration and design

1. Group requests by API boundary and operation; remove secrets.
2. Hand-review OAS operations, status codes, media types, and schemas.
3. Move setup, auth, and request chaining into native fixtures or helpers.
4. Keep OAS shape validation in the validator and business assertions in one suite.
5. Run bash ./run.sh and review output.

Use a small API client object for base URLs, requests, and timeouts. Keep schema validation separate from business assertions. Rust uses a struct, Go a client struct, Python a dataclass, and JS, TS, Java, and C# use classes. Page Object Model is for browser UI; this project has no browser UI.

A successful run reports OAS validation for the Product response and the Order create/read/confirm/delete/404 lifecycle across native suites and Playwright.
