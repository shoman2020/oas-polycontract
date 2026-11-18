# Client suites

Seven native suites call the live Product and stateful Order APIs. Playwright adds APIRequestContext coverage. Each response is validated against the reviewed OAS.

Run all examples with `bash ./run.sh`. Testcontainers coordinates the local containers; Docker Compose is not required. CI uses the same entry point.

## Contract-based testing

| Test | Source | Target |
|---|---|---|
| Provider contract-based test | Specmatic provider verification | Live Product API at app:8080 |
| Consumer contract-based test | JavaScript and Playwright consumer suites | Specmatic Smart Mock at specmatic-mock:9000 |

Consumers check client expectations against responses generated from the provider OAS; they do not publish a separate CDC contract.

## API integration testing

These suites call live services, validate status, media type, and response schema, then check behavior.

| Test | Source | Target |
|---|---|---|
| Product API integration test | Seven native suites and Playwright | Live Product API |
| Stateful API integration test | Seven native suites | Order API lifecycle: create, read, confirm, delete, verify 404 |
| Downstream service integration test | WireMock integration suite | Product API and WireMock request journal |

## Manual debugging and collection migration

[Postman](../legacy/postman/oas-polycontract.postman_collection.json) and [Bruno](../legacy/bruno/) collections follow the Product and Order OAS for interactive debugging and legacy migration. CI uses Specmatic for provider and consumer contract checks, plus Schemathesis, WireMock, and code-based integration suites. See [legacy/README.md](../legacy/README.md) for local setup.

| Language | Test runner and OAS validator |
|---|---|
| Rust | cargo test, reqwest, and jsonschema |
| Go | go test, net/http, and kin-openapi |
| Python | pytest, Requests, and openapi-core |
| JavaScript | node:test, Fetch, and @oaverify/core |
| TypeScript | Vitest, Fetch, and @oaverify/core |
| Java | JUnit, REST Assured, and OpenAPI validator |
| C# | xUnit, HttpClient, and NJsonSchema |
| Playwright | Playwright Test, APIRequestContext, and @oaverify/core; Product API only |

## Test files

| Role | Implemented source |
|---|---|
| Consumer contract | [JavaScript](js/consumer-contract.test.mjs), [Playwright](playwright/consumer-contract.spec.mjs) |
| Product API integration | [Rust](rust/tests/api_integration_test.rs), [Go](go/product_api_integration_test.go), [Python](python/test_product_api_integration.py), [JavaScript](js/product-api-integration.test.mjs), [TypeScript](ts/product-api-integration.test.ts), [Java](java/src/test/java/nl/shiftleft/ProductApiIntegrationTest.java), [C#](csharp/ProductApiIntegrationTests.cs), [Playwright](playwright/product-api-integration.spec.mjs) |
| Stateful API integration | [Rust](rust/tests/api_integration_test.rs), [Go](go/stateful_order_api_integration_test.go), [Python](python/test_stateful_order_api_integration.py), [JavaScript](js/stateful-order-api-integration.test.mjs), [TypeScript](ts/stateful-order-api-integration.test.ts), [Java](java/src/test/java/nl/shiftleft/StatefulOrderApiIntegrationTest.java), [C#](csharp/StatefulOrderApiIntegrationTests.cs) |

Product tests call `GET /products/demo-sku`; native suites also run the linked Order lifecycle. The Product API is GET-only, and Order state is isolated per run. The downstream suite checks the WireMock journal. Smart Mock examples and dictionary fallbacks use deterministic evaluations.

## Migration and design

1. Group requests by API boundary; remove secrets.
2. Review OAS operations, status codes, media types, and schemas.
3. Move setup, auth, and chaining into native helpers.
4. Keep schema checks in validators and behavior checks in tests.
5. Run `bash ./run.sh`.

Keep a small API client for base URLs, requests, and timeouts. Separate schema validation from business assertions. Use native structs, dataclasses, or classes. Page Object Model is for browser UI; these are API tests.

CI also checks committed Rust, Go, and NuGet locks. Each native suite validates live API responses against its contract before checking business behavior.
