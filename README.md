# oas-polycontract

One hand-edited contract per API boundary. Test code in each language. Validate every request and response against the contract, and keep business assertions in the language-native suite.

## Quick start

Requirements: Docker Engine and Docker Compose v2. From the repository root:

```sh
bash ./run.sh
```

On macOS, use Docker Desktop or Colima with the Docker CLI and Compose installed; the script works locally. Windows users can run it through WSL or Git Bash. The pipeline builds the demo app and patched WireMock image, checks the downstream call, runs provider and downstream Specmatic tests, then removes the containers.

GitHub Actions runs the same pipeline on Ubuntu. macOS is supported for local runs and is not a CI runner. Security workflows run CodeQL, Gitleaks, Trivy, and pull request dependency review.

## Contract formats and protocols

OpenAPI describes HTTP APIs and payload formats, including JSON and XML. It does not define WebSocket or Kafka contracts. Use AsyncAPI for WebSocket, Kafka, MQTT, AMQP, and other event-driven interfaces; use Protocol Buffers and gRPC service definitions for gRPC; use GraphQL SDL for GraphQL. Keep one canonical contract per interface and validate it with tools that understand that format. Link related contracts when an API spans HTTP and events.

## Language-native integration tests

The migration path is: inventory existing requests and assertions, map operations and schemas to OAS, hand-review the contract, then port behavioral assertions into the selected language suite. The OAS remains the shared validation source. Choose a native framework and add a schema validator or generated types from the committed OAS; generated artifacts are disposable and checked for drift in CI.

| Language | Suggested test stack | Contract validation approach |
|---|---|---|
| Rust | `cargo test` + `reqwest` | Generate typed clients/models from OAS with `oapi-codegen` alternatives such as `progenitor`; validate responses against OAS schemas where runtime validation is required. |
| Go | `testing` + `net/http` | Generate clients with `oapi-codegen`; use `kin-openapi` request/response validation. |
| Python | `pytest` + `requests` | Use Schemathesis for OAS-driven cases and Hypothesis; keep business assertions in pytest. |
| JavaScript | `node:test` or Jest + `fetch` | Use generated client/types and an OpenAPI response validator such as `jest-openapi`. |
| TypeScript | Vitest/Jest + `fetch` | Generate typed clients with `openapi-typescript`; validate runtime responses with an OAS validator. Types alone do not validate wire data. |
| Java | JUnit + REST Assured | Use `swagger-request-validator` with REST Assured or generated Java models. |
| C# | xUnit + `HttpClient` | Generate client/models with NSwag and validate responses against OAS schemas. |

These are recommended starting points, not yet implemented suites. The runnable reference is the Node demo with Specmatic provider/downstream checks and a WireMock integration test. See [`ROADMAP.md`](ROADMAP.md) for planned client starters and current phase status.

## Repository map

- `openapi/`: root Product Catalog contract and compatibility baseline.
- `demo/`: runnable Node provider, demo OAS, downstream OAS, WireMock stub, and WireMock image.
- `clients/`: language-specific test suites (planned).
- `gates/`: lint and compatibility checks.
- `docker-compose.yml` and `run.sh`: local demo pipeline entry point.
- `.github/workflows/`: contract and security CI.

## Contribute

Have a feature idea or found a bug? [Open an issue](https://github.com/shoman2020/oas-polycontract/issues). For bugs, include reproduction steps, expected and actual results, and relevant logs or environment details. See [`CONTRIBUTING.md`](CONTRIBUTING.md) before changing contracts.
