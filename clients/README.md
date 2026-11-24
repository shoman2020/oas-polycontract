# Client test guide

This guide maps each native stack to its runner, validator, and test files. See the [README testing model](../README.md#testing-model-and-terminology) for test roles and [run requirements](../README.md#run).

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

### Validation nuances and language asymmetries

While each native suite validates responses against the OpenAPI specifications, language ecosystems differ significantly in how they handle OpenAPI 3.0 semantics:

- **JavaScript / TypeScript**: Validates directly via `@oaverify/core` and AJV. Requests and responses adhere strictly to declared schema structures with structured logging.
- **Rust / C#**: Standard ecosystem validators (`jsonschema` crate and `NJsonSchema`) target standard JSON Schema (Draft 7 / 2020-12) rather than OpenAPI 3.0.3 dialect nuances. To bridge this, both suites feature scoped adapters that normalize `nullable: true` into union types (`["<type>", "null"]`), map `exclusiveMinimum` booleans, and resolve local component references (`#/components/schemas/` to `#/$defs/`).
- **Java**: Uses REST Assured with Atlassian's `OpenApiValidationFilter`. Because Atlassian's filter validates both outgoing requests and incoming responses simultaneously, intentional client-side error tests (such as malformed raw paths or payloads violating request schemas) bypass the request-side filter via explicit unvalidated helpers (`getProductPathUnvalidated`, `createOrderUnvalidated`) so the server's HTTP error response can still be received and validated without client-side filter abortion.
- **Go / Python**: Native libraries (`kin-openapi` and `openapi-core`) provide standard OpenAPI 3.0 request/response validation out-of-the-box.

## Migrating request collections

1. Group requests by API boundary and remove credentials.
2. Compare methods, paths, parameters, media types, and schemas with the matching OAS.
3. Move reusable setup, authentication, and request chaining into a native API client.
4. Keep response schema validation in the validator and business assertions in tests.
5. Run the relevant suite; see [run instructions](../README.md#run).

Per-API clients keep routes and HTTP transport out of test assertions. The examples follow each language's conventions and avoid browser-page abstractions for HTTP tests. Postman and Bruno usage is in the [legacy guide](../legacy/README.md).
