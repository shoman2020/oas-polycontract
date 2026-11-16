# Client suite migration guide

The seven examples target the runnable Product API in `demo/`. They read
`demo/openapi.yaml` directly at test time; generated clients and model types
are optional and do not replace runtime response validation.

## Port a Postman or Bruno collection

1. Export requests, remove credentials and environment-specific secrets, and
   group requests by API boundary and operation.
2. Compare each operation, status, media type, and body with the hand-reviewed
   OpenAPI contract. Add missing structural constraints and examples to OAS.
3. Move setup such as authentication, shared headers, and request chaining
   into the target framework's fixtures or helpers.
4. Remove status and body-shape assertions that OAS validation already checks.
   Keep business assertions in one native test suite.
5. Run `bash ./run.sh`. It executes all seven clients against the demo service.
   The JavaScript suite also targets Specmatic's Smart Mock to show a consumer
   using the same contract.

## What each test validates

Each suite sends `GET /products/demo-sku`, validates the actual response
status, content type, and JSON body with its language's OpenAPI-aware library,
then checks the business result (`available` is 7). This keeps the contract
assertion in the shared OAS while making the behavioral check explicit in code.

| Language | Test entry point | OAS validation |
|---|---|---|
| Rust | `cargo test` | Resolves the operation response schema and local `$ref` from OAS, then uses `jsonschema`. |
| Go | `go test ./...` | Uses `kin-openapi` to locate the route and validate the complete HTTP response. |
| Python | `pytest` | Uses `openapi-core` with Requests request/response adapters. |
| JavaScript | `node --test` | Uses `@oaverify/core` and its YAML loader with Fetch request/response objects. |
| TypeScript | `tsc --noEmit`, then Vitest | Uses `@oaverify/core` and the YAML loader; the Fetch result is typed after runtime validation. |
| Java | `mvn test` | REST Assured's Atlassian `OpenApiValidationFilter` validates request and response. |
| C# | `dotnet test` | Reads the response schema and status from the OAS YAML, then uses `NJsonSchema`. |

The Rust and C# starters resolve the operation response and schema from the
contract but intentionally support local component `$ref`s only. For larger
contracts, prefer a full OpenAPI validator for that language or resolve and
bundle external references before validation.

## Representative output

Exact formatting varies by framework. A successful run reports one test per
language and the same contract outcome:

```text
Rust       test product_response_matches_openapi_contract ... ok
Go         --- PASS: TestProductResponseMatchesOpenAPIContract
Python     test_contract.py::test_product_response_matches_openapi_contract PASSED
JavaScript ✔ product response matches the OpenAPI contract
TypeScript ✓ validates the response against the OAS and checks the business result
Java       Tests run: 1, Failures: 0, Errors: 0, Skipped: 0
C#         Passed! - Failed: 0, Passed: 1, Skipped: 0, Total: 1

OAS validation passed: GET /products/demo-sku -> 200
```
