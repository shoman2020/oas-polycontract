# Client test guide

This guide maps each native stack to its runner, validator, and test files. For run requirements and the testing model, see the [README](../README.md).

## Native stacks

| Language | Test runner | HTTP client | OAS response validator |
|---|---|---|---|
| Rust | cargo test | reqwest | jsonschema |
| Go | go test | net/http | kin-openapi |
| Python | pytest | Requests | openapi-core |
| JavaScript | node:test | Fetch | @oaverify/core |
| TypeScript | Vitest | Fetch | @oaverify/core |
| Java | JUnit | REST Assured | OpenAPI validator |
| C# | xUnit | HttpClient | NJsonSchema via project-scoped adapter |
| Playwright | Playwright Test | APIRequestContext | @oaverify/core; Product API only |

## Test entry points

| Test role | Implemented source |
|---|---|
| Consumer development against a provider Smart Mock | [JavaScript](js/consumer-contract.test.mjs), [Playwright](playwright/consumer-contract.spec.mjs) |
| BDD acceptance | [Product feature](features/product-api.feature), [Product steps](js/bdd/product-api.steps.mjs), [Order feature](features/order-api.feature), [Order steps](js/bdd/order-api.steps.mjs), [shared acceptance data](shared/acceptance-cases.json) |
| TDD service unit tests | [Product API](../demo/app/tests/server.test.mjs), [Order API](../demo/stateful/server.test.mjs) |
| Product API integration | [Rust](rust/tests/api_integration_test.rs), [Go](go/product_api_integration_test.go), [Python](python/test_product_api_integration.py), [JavaScript](js/product-api-integration.test.mjs), [TypeScript](ts/product-api-integration.test.ts), [Java](java/src/test/java/nl/shiftleft/ProductApiIntegrationTest.java), [C#](csharp/ProductApiIntegrationTests.cs), [Playwright](playwright/product-api-integration.spec.mjs) |
| Stateful Order integration | [Rust](rust/tests/api_integration_test.rs), [Go](go/stateful_order_api_integration_test.go), [Python](python/test_stateful_order_api_integration.py), [JavaScript](js/stateful-order-api-integration.test.mjs), [TypeScript](ts/stateful-order-api-integration.test.ts), [Java](java/src/test/java/nl/shiftleft/StatefulOrderApiIntegrationTest.java), [C#](csharp/StatefulOrderApiIntegrationTests.cs) |

Shared [Gherkin features](features/) supply scenario data to all seven native suites. Product and Order have separate Cucumber steps, and isolated Node.js service tests cover the same behavior. Update the feature and add a failing service test before implementation; see [feature guidance](features/README.md).

Product suites exercise `GET /products/demo-sku` and error paths. Order suites test the stateful lifecycle; downstream integration checks the WireMock request journal. Consumer mock checks use deterministic provider-OAS examples.

All seven suites validate exercised responses against OAS. Rust and C# adapters have focused conformance tests; other languages use their native validator libraries. Define an OAS feature matrix before adopting the adapters for a larger API.

## Migrating request collections

1. Group requests by API boundary and remove credentials.
2. Compare methods, paths, parameters, media types, and schemas with the matching OAS.
3. Move reusable setup, authentication, and request chaining into a native API client.
4. Keep response schema validation in the validator and business assertions in tests.
5. Run the relevant suite; see [run instructions](../README.md#run).

Per-API clients keep routes and HTTP transport out of test assertions. The examples follow each language's conventions and avoid browser-page abstractions for HTTP tests. Postman and Bruno usage is in the [legacy guide](../legacy/README.md).
