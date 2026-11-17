# Client suite migration guide

The examples target the Product API and a separate stateful Order API in
`demo/`, each with its own hand-edited OAS. Seven suites use language-native
frameworks; Playwright adds a JavaScript `APIRequestContext` suite without
launching a browser. Generated clients and model types are optional and do not
replace runtime response validation.

## Port a Postman or Bruno collection

1. Export requests, remove credentials and environment-specific secrets, and
   group requests by API boundary and operation.
2. Compare each operation, status, media type, and body with the hand-reviewed
   OpenAPI contract. Add missing structural constraints and examples to OAS.
3. Move setup such as authentication, shared headers, and request chaining
   into the target framework's fixtures or helpers.
4. Remove status and body-shape assertions that OAS validation already checks.
   Keep business assertions in one native test suite.
5. Run `bash ./run.sh`. It executes the seven language suites and Playwright
   against the Product API. JavaScript and Playwright also target Specmatic's
   Smart Mock for consumer-side examples using the same contract.
6. The same command runs stateless Schemathesis fuzzing, Schemathesis stateful
   tests, and a native order lifecycle integration test in each of the seven
   languages. The stateful tests use a separate in-memory Order API; the
   Product API remains GET-only.

## What each test validates

Each suite sends `GET /products/demo-sku`, validates the actual response
status, content type, and JSON body with its language's OpenAPI-aware library,
then checks the business result (`available` is 7). It also creates an order,
reads it, confirms it, deletes it, and verifies the next read returns `404`.
Each lifecycle response is validated against `demo/stateful/openapi.yaml`.

| Language or runner | Test entry point | OAS validation |
|---|---|---|
| Rust | `cargo test` | Resolves the operation response schema and local `$ref` from OAS, then uses `jsonschema`. |
| Go | `go test ./...` | Uses `kin-openapi` to locate the route and validate the complete HTTP response. |
| Python | `pytest` | Uses `openapi-core` with Requests request/response adapters. |
| JavaScript | `node --test` | Uses `@oaverify/core` and its YAML loader with Fetch request/response objects. |
| TypeScript | `tsc --noEmit`, then Vitest | Uses `@oaverify/core` and the YAML loader; the Fetch result is typed after runtime validation. |
| Playwright API (JavaScript) | `npm run test:provider` | Uses `APIRequestContext`; adapts the response to Fetch objects and validates it with `@oaverify/core`. |
| Java | `mvn test` | REST Assured's Atlassian `OpenApiValidationFilter` validates request and response. |
| C# | `dotnet test` | Reads the response schema and status from the OAS YAML, then uses `NJsonSchema`. |

The Rust and C# starters resolve the operation response and schema from the
contract but intentionally support local component `$ref`s only. For larger
contracts, prefer a full OpenAPI validator for that language or resolve and
bundle external references before validation.

## Test design

Each language suite uses a small `ProductApiClient` object to centralize base
URL handling, request construction, and timeouts. The native OpenAPI validator
and business assertions remain separate, so test methods describe behavior
instead of repeating transport setup. Rust uses a struct with methods, Go a
client struct, Python a dataclass, and JavaScript, TypeScript, Java, and C# use
classes.

Playwright uses the same client pattern around its `APIRequestContext` fixture.
Its provider test calls the healthy app; its consumer test calls the Specmatic
Smart Mock. Run the two examples separately with `npm run test:provider` and
`npm run test:consumer` inside `clients/playwright/` after setting
`API_BASE_URL` and `OPENAPI_SPEC` for the intended target.

Page Object Model is for browser UI automation. This repository has no browser
UI, so its API clients use the equivalent service-object pattern for HTTP
operations; there is no page model to maintain.

## Representative output

Exact formatting varies by framework. A successful run reports the same
contract outcome from each language-native suite and the Playwright API suite:

```text
Rust       test product_response_matches_openapi_contract ... ok
Go         --- PASS: TestProductResponseMatchesOpenAPIContract
Python     test_contract.py::test_product_response_matches_openapi_contract PASSED
JavaScript ✔ product response matches the OpenAPI contract
TypeScript ✓ validates the response against the OAS and checks the business result
Playwright Provider integration passed: GET /products/demo-sku -> 200
Playwright Consumer contract passed: GET /products/demo-sku -> 200 from Specmatic Smart Mock
Java       Tests run: 1, Failures: 0, Errors: 0, Skipped: 0
C#         Passed! - Failed: 0, Passed: 1, Skipped: 0, Total: 1

OAS validation passed: GET /products/demo-sku -> 200
Stateful OAS validation passed: create -> read -> confirm -> delete -> 404
```

