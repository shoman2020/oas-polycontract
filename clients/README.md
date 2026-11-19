# Client test guide

This guide lists the native runners, validators, and test entry points. The [testing model](../README.md#testing-model-and-terminology) distinguishes provider contract verification, consumer-side development against a provider Smart Mock, and live API integration tests.

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

The shared [Gherkin acceptance features](features/) define the scenarios and input data for Rust, Go, Python, JavaScript, TypeScript, Java, and C# suites. JavaScript Cucumber step files are split by API; every native suite reads data generated from the same feature files. The runner checks that generated data is current before container startup. Isolated Node.js service tests cover the same behavior. For changes, update the feature and add a failing service test before implementation. See [feature and TDD guidance](features/README.md).

Product tests call `GET /products/demo-sku`. Native suites also run the linked Order lifecycle; each Order app instance starts with empty state. The downstream integration test verifies the WireMock request journal. Consumer development checks and mock-data evaluations use deterministic responses generated from the provider OAS.

All seven native suites validate exercised responses against OAS. Validator behavior differs by library: Rust and C# use project-scoped adapters with conformance tests for nullable values, `exclusiveMinimum`, and nested local references; the other suites use their language libraries. Spectral, Specmatic, and Schemathesis provide shared contract gates. Before applying the examples to a larger API, define and verify a validator coverage matrix for the OAS features that API uses.

The runner mounts contract and client source read-only. It copies client projects into temporary container workspaces for dependency installation and build output, keeping tests from changing the source OAS or checked-in clients.

## Migrating request collections

1. Group requests by API boundary and remove credentials.
2. Compare methods, paths, parameters, media types, and schemas with the matching OAS.
3. Move reusable setup, authentication, and request chaining into a native API client.
4. Keep response schema validation in the validator and business assertions in tests.
5. Run `bash ./run.sh`.

Product and Order API clients encapsulate base URLs, routes, timeouts, and HTTP transport. Tests use those service objects and keep assertions in the native test framework. Languages expose API interfaces where they fit their conventions; Go abstracts transport behind `HTTPDoer`, and Rust uses composition. Each suite owns its client and state, while all seven consume the same generated feature data. This is the API equivalent of the Page Object Model: it keeps request details out of assertions without adding browser-page abstractions to HTTP tests. Postman and Bruno remain available for manual debugging; see [legacy collection setup](../legacy/README.md).
