# oas-polycontract

One hand-edited contract per API boundary. Test code in each language. Validate every request and response against the contract, and keep business assertions in the language-native suite.

## Quick start

Requirements: Docker Engine and Docker Compose v2. From the repository root:

```sh
bash ./run.sh
```

On macOS, use Docker Desktop or Colima with the Docker CLI and Compose installed; the script works locally. Windows users can run it through WSL or Git Bash. The pipeline builds the demo app and patched WireMock image, checks the downstream call, runs provider and downstream Specmatic tests, validates external examples, then removes the containers.

GitHub Actions runs the same pipeline on Ubuntu. macOS is supported for local runs and is not a CI runner. Security workflows run CodeQL, Gitleaks, Trivy, and pull request dependency review.

## Contract formats and protocols

Choose the contract standard by interface. `.json`, `.yaml`, and `.yml` are document encodings; they do not identify the protocol. The contract content type and transport are separate choices.

| Interface | Contract standard | Payload or wire formats |
|---|---|---|
| HTTP APIs | OpenAPI (OAS) | JSON (`application/json`), XML (`application/xml`), form and multipart data, text, and binary media types as described per operation. |
| WebSockets and event-driven APIs | AsyncAPI | JSON, XML, Avro, or Protobuf messages over WebSocket, Kafka, MQTT, AMQP, NATS, and supported brokers. |
| gRPC | Protocol Buffers service definitions | Protobuf messages over HTTP/2. |
| GraphQL | GraphQL SDL | GraphQL operations over HTTP; subscriptions may use WebSocket or SSE transports. |
| SOAP | WSDL | XML messages, commonly over HTTP. |

OpenAPI describes HTTP request/response APIs; it does not define Kafka topics or WebSocket message flows. Use one canonical contract per interface, validate it with tools that understand that standard, and link related contracts when a service exposes HTTP and event interfaces. Do not force every protocol into an OpenAPI file.

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

## Mock data patterns

The demo's Specmatic mock has three data sources, ordered by intent:

1. **Exact scenarios:** operation examples in [`demo/openapi.yaml`](demo/openapi.yaml) describe common responses. Use these when a response must be fixed and visible with the API contract.
2. **Named datasets:** files under [`demo/openapi_examples/`](demo/openapi_examples/) pair a concrete request with its deterministic response. The `vip-sku` request always returns the checked-in VIP response.
3. **Domain-shaped fallback:** [`demo/openapi_dictionary.yaml`](demo/openapi_dictionary.yaml) supplies meaningful values when the mock has no matching example. Dictionary lists are sampled pseudo-randomly, so don't use them when a test needs a specific response.

Start the standalone mock with `docker compose --profile mock up specmatic-mock`; it listens on `http://localhost:9000`. The normal `bash ./run.sh` pipeline runs the real demo provider, validates external example files, and does not start this optional mock.

AI can help draft realistic, varied mock datasets from schemas and approved domain vocabulary. Review and validate generated data, remove secrets and personal data, then commit fixtures or dictionaries. Do not make live AI generation part of the contract or a deterministic CI test. See [Specmatic dictionaries](https://docs.specmatic.io/features/dictionary.html), [external examples](https://docs.specmatic.io/features/external_examples.html), and [service virtualization](https://docs.specmatic.io/spec_driven_api_development/service_virtualization).

## Repository map

- `openapi/`: root Product Catalog contract and compatibility baseline.
- `demo/`: runnable Node provider, demo OAS, downstream OAS, WireMock stub, and WireMock image.
- `clients/`: language-specific test suites (planned).
- `gates/`: lint and compatibility checks.
- `docker-compose.yml` and `run.sh`: local demo pipeline entry point.
- `.github/workflows/`: contract and security CI.

## Contribute

Have a feature idea or found a bug? [Open an issue](https://github.com/shoman2020/oas-polycontract/issues). For bugs, include reproduction steps, expected and actual results, and relevant logs or environment details. See [`CONTRIBUTING.md`](CONTRIBUTING.md) before changing contracts.
