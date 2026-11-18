# Client test guide

This guide lists the native runners, validators, and test entry points. The project's canonical [testing model and terminology](../README.md#testing-model-and-terminology) explains the distinction between provider contract tests, consumer contract tests, and API integration tests.

Run all suites with `bash ./run.sh`. The Node.js Testcontainers runner starts the Product API, Order API, WireMock, and Specmatic Smart Mock on a private network. A Docker-compatible runtime is required; Docker Compose is not.

## Native stacks

| Language | Test runner | HTTP client | OAS response validator |
|---|---|---|---|
| Rust | cargo test | reqwest | jsonschema |
| Go | go test | net/http | kin-openapi |
| Python | pytest | Requests | openapi-core |
| JavaScript | node:test | Fetch | @oaverify/core |
| TypeScript | Vitest | Fetch | @oaverify/core |
| Java | JUnit | REST Assured | OpenAPI validator |
| C# | xUnit | HttpClient | NJsonSchema |
| Playwright | Playwright Test | APIRequestContext | @oaverify/core; Product API only |

## Test entry points

| Test role | Implemented source |
|---|---|
| Consumer contract | [JavaScript](js/consumer-contract.test.mjs), [Playwright](playwright/consumer-contract.spec.mjs) |
| Product API integration | [Rust](rust/tests/api_integration_test.rs), [Go](go/product_api_integration_test.go), [Python](python/test_product_api_integration.py), [JavaScript](js/product-api-integration.test.mjs), [TypeScript](ts/product-api-integration.test.ts), [Java](java/src/test/java/nl/shiftleft/ProductApiIntegrationTest.java), [C#](csharp/ProductApiIntegrationTests.cs), [Playwright](playwright/product-api-integration.spec.mjs) |
| Stateful Order integration | [Rust](rust/tests/api_integration_test.rs), [Go](go/stateful_order_api_integration_test.go), [Python](python/test_stateful_order_api_integration.py), [JavaScript](js/stateful-order-api-integration.test.mjs), [TypeScript](ts/stateful-order-api-integration.test.ts), [Java](java/src/test/java/nl/shiftleft/StatefulOrderApiIntegrationTest.java), [C#](csharp/StatefulOrderApiIntegrationTests.cs) |

Product tests call `GET /products/demo-sku`. Native suites also run the linked Order lifecycle; each pipeline run starts with empty Order state. The downstream integration test verifies the WireMock request journal. Consumer tests and mock-data evaluations use deterministic Smart Mock responses.

## Migrating request collections

1. Group requests by API boundary and remove credentials.
2. Compare methods, paths, parameters, media types, and schemas with the matching OAS.
3. Move reusable setup, authentication, and request chaining into a native API client.
4. Keep response schema validation in the validator and business assertions in tests.
5. Run `bash ./run.sh`.

Use a small client object for base URLs, requests, and timeouts. Use language-native types and tests. Page Object Model applies to browser UI tests; these examples use Playwright's APIRequestContext, so they do not need page objects. Postman and Bruno remain available for manual debugging; see [legacy collection setup](../legacy/README.md).
