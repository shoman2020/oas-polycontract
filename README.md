# oas-polycontract

One reviewed contract per API boundary. Specmatic checks provider behavior against the live API and consumer expectations against a generated Smart Mock. Native suites validate live responses against the OAS.

## Purpose

- Keep one reviewed contract for each API boundary; use it for provider and consumer checks.
- Validate live behavior with native integration suites. Specmatic covers contract tests; Schemathesis covers fuzzing and stateful flows.
- Use Swagger UI and Prism to inspect the Catalog scaffold; use the Postman and Bruno examples with the runnable Product and Order APIs.
- Reduce duplicate specs and overlapping tools to lower maintenance and tooling costs.
- Keep contracts usable across clients, test frameworks, and vendors. One contract owner means less maintenance and more trust.

[Interactive showcase](https://shoman2020.github.io/oas-polycontract/) · [Contracts](https://shoman2020.github.io/oas-polycontract/#contracts) · [Test roles](https://shoman2020.github.io/oas-polycontract/#test-roles) · [Test behavior](https://shoman2020.github.io/oas-polycontract/#test-behavior) · [Pipeline](https://shoman2020.github.io/oas-polycontract/#pipeline) · [Workflows](https://shoman2020.github.io/oas-polycontract/#workflows) · [Performance](https://shoman2020.github.io/oas-polycontract/#performance) · [Roadmap](ROADMAP.md)

## Flow overview

These diagrams render in this README. Open the [interactive showcase](https://shoman2020.github.io/oas-polycontract/) for the full project, pipeline, workflow, and performance maps.

### Contract and test flow

```mermaid
flowchart LR
  ProductOAS[Product OAS] --> ProviderTest[Specmatic provider test]
  ProviderTest --> ProductAPI[Live Product API]
  ProductOAS --> SmartMock[Specmatic Smart Mock]
  SmartMock --> ConsumerTests[JavaScript and Playwright consumer tests]
  ProductOAS --> NativeSuites
  subgraph NativeSuites["Native API suites"]
    direction TB
    RustSuite["Rust<br/>cargo test · reqwest · jsonschema"]
    GoSuite["Go<br/>go test · net/http · kin-openapi"]
    PythonSuite["Python<br/>pytest · Requests · openapi-core"]
    JavaScriptSuite["JavaScript<br/>node:test · Fetch · @oaverify/core"]
    TypeScriptSuite["TypeScript<br/>Vitest · Fetch · @oaverify/core"]
    JavaSuite["Java<br/>JUnit · REST Assured · OpenAPI validator"]
    CSharpSuite["C#<br/>xUnit · HttpClient · NJsonSchema"]
  end
  NativeSuites --> ProductAPI
  ProductOAS --> Playwright[Playwright APIRequestContext + @oaverify/core]
  Playwright --> ProductAPI
  ProductOAS --> ProductFuzzing[Schemathesis stateless fuzzing]
  ProductFuzzing --> ProductAPI
  OrderOAS[Order OAS] --> StatefulTests[Stateful Schemathesis and native suites]
  StatefulTests --> OrderAPI[Live Order API]
  ProductAPI --> WireMock[WireMock downstream]
  ProductOAS --> Collections[Postman and Bruno manual collections]
  Collections --> ProductAPI
  OrderOAS --> Collections
```

Native suites are code-based API integration tests: they call the running API, validate responses against OAS, and assert behavior in each language's test framework. Specmatic separates contract roles: provider tests hit the live Product API, and consumer tests hit the Smart Mock. Schemathesis generates Product fuzz cases and stateful Order flows. Playwright uses APIRequestContext, not browser UI automation.

### CI workflow

```mermaid
flowchart TB
  AnyPush[Push to any branch] --> Contract[contract.yml]
  PullRequest[Pull request] --> Contract
  Manual[Manual workflow dispatch] --> Contract
  Contract --> Runner[Testcontainers runner in Node.js]
  Runner --> Runtime[Docker-compatible container runtime]
  Runtime --> Tasks[Build images, start services, run test containers]
  Tasks --> Cleanup[Stop containers and network]
  Runner --> ImageScans[Trivy image scans]

  MainPush[Push to main] --> Security[security.yml]
  PullRequest --> Security
  Weekly[Weekly schedule] --> Security
  Manual --> Security
  Security --> CodeQL[CodeQL]
  Security --> Secrets[Gitleaks]
  Security --> FileScan[Trivy filesystem scan]
  Security --> AIScan[OWASP GenAI scan: SecureAI-Scan]
  PullRequest -.-> Review[Dependency Review]

  ShowcasePush[Main push to showcase files] --> Showcase[showcase.yml]
  Manual --> Showcase
  Showcase --> Pages[GitHub Pages]
  Manual --> Performance[performance.yml]
  Performance --> Runners[Ubuntu 24.04 and 26.04]
  Runners --> Samples[One cold and four warm runs per runner]
  Samples --> Timings[Per-runner stage medians and ranges]
  Dependabot[Dependabot weekly updates] --> UpdatePR[Dependency update pull request]
  UpdatePR --> PullRequest
```

## Run

Requires Node.js 26, npm 12.2.2, and a Docker-compatible container runtime. Testcontainers for Node.js manages the pipeline; Docker Compose is not required.

```sh
bash ./run.sh
```

`run.sh` checks the pinned Node.js/npm versions, installs the locked pipeline dependency, and starts an isolated Testcontainers network. It runs repository evaluations and contract gates, builds the project images, starts the APIs, executes Specmatic/WireMock examples, fuzzing and API suites, then stops the containers and network. Task containers receive only needed contract or fixture paths as read-only mounts. Use Docker Desktop or Colima on macOS, or Docker Desktop with WSL/Git Bash on Windows. CI uses Ubuntu.

Last verified before the Testcontainers change: [contract run 44260518222 passed](https://github.com/shoman2020/oas-polycontract/actions/runs/44260518222), including image scans and 12/12 repository evaluations. [Security run 44260518424 passed](https://github.com/shoman2020/oas-polycontract/actions/runs/44260518424). [Showcase deployment 44260518106 passed](https://github.com/shoman2020/oas-polycontract/actions/runs/44260518106). The new orchestration run is pending.

## Contracts

| Boundary | Contract | Implementation and checks |
|---|---|---|
| Product Catalog | [Root OAS](openapi/openapi.yaml) | Design scaffold; Spectral, oasdiff, Swagger UI, Prism |
| Product API | [Demo OAS](demo/openapi.yaml) | Node.js; Specmatic, Schemathesis, seven languages, Playwright |
| Order API | [Stateful OAS](demo/stateful/openapi.yaml) | In-memory Node.js; stateful Schemathesis and seven native suites |
| Inventory dependency | [Downstream OAS](demo/downstream/openapi.yaml) | WireMock mappings, Specmatic, downstream integration |
| Product events | [AsyncAPI examples](contracts/events/) | WebSocket and Kafka message contracts; lint only |

OpenAPI covers HTTP operations and payloads such as JSON and XML. AsyncAPI covers event messages over WebSocket and Kafka. Event examples are linted; no event provider or broker is included.

## Test roles

Contract-based tests verify either side of the shared contract. API integration tests call a running service, validate responses against OAS, then assert behavior.

### Contract-based testing

| Test | Source | Target |
|---|---|---|
| Provider contract-based test | Specmatic provider verification | Live Product API, app:8080 |
| Consumer contract-based test | JavaScript and Playwright | Specmatic Smart Mock, specmatic-mock:9000 |

Consumers use the provider OAS; no separate CDC artifact is published.

### API integration testing

| Test | Source | Target |
|---|---|---|
| Product API integration test | Seven native suites and Playwright | Live Product API |
| Stateful API integration test | Seven native suites | Live Order API; create, read, confirm, delete, then 404 |
| Downstream service integration test | WireMock integration suite | Product API and WireMock request journal |

### Manual debugging and collection migration

The [Postman and Bruno collections](legacy/) follow the Product and Order OAS for interactive requests. They support manual debugging and migration of older request workflows. See [legacy/README.md](legacy/README.md) for import and local-service instructions. CI runs Specmatic, Schemathesis, WireMock, and code-based API integration checks.

See the [client guide](clients/README.md) for test entry points, validators, migration, and sample output.

## Fuzzing and mock data

Stateless Schemathesis fuzzing sends independent Product API requests. Only the unavailable-inventory lookup allows the documented 502. Stateful Schemathesis follows linked Order operations and reuses returned IDs; the Order service starts empty per run.

Specmatic mock data uses OAS examples, fixtures in `demo/openapi_examples`, and values in `demo/openapi_dictionary.yaml`. Repository evaluations check fixture responses and dictionary fallbacks. Keep sample data deterministic and review changes before committing.

## Security gates

contract.yml runs the demo pipeline and Trivy image scans. security.yml runs CodeQL, Gitleaks, Trivy filesystem checks, Dependency Review on pull requests, and the OWASP GenAI scan. Dependabot checks package manifests weekly.

Triggers: **Push to any branch**, **Push to main**, **Pull request**, **Weekly schedule**, and **Manual workflow dispatch**. See the [interactive workflow map](https://shoman2020.github.io/oas-polycontract/#workflows).

The [OWASP SecureAI-Scan](https://genai.owasp.org/solution/secureai-scan/) gate checks AI, LLM, and MCP source, fails on high findings, and uploads SARIF. This project has no runtime AI or MCP integration.

The workflow provides SecureAI-Scan examples for JavaScript, TypeScript, and Python. Run a focused scan when those folders contain AI or MCP code:

```sh
source .github/versions.env
npx --yes "secureai-scan@$SECUREAI_SCAN_VERSION" scan clients/js --fail-on high
npx --yes "secureai-scan@$SECUREAI_SCAN_VERSION" scan clients/ts --fail-on high
npx --yes "secureai-scan@$SECUREAI_SCAN_VERSION" scan clients/python --fail-on high
```

The current client directories contain API tests only. Rust, Go, Java, and C# are included in the CodeQL matrix; CodeQL is general static analysis, not an AI-specific ruleset.

| Language | OWASP AI example | General source analysis |
|---|---|---|
| JavaScript | `scan clients/js --fail-on high` | CodeQL `javascript-typescript` |
| TypeScript | `scan clients/ts --fail-on high` | CodeQL `javascript-typescript` |
| Python | `scan clients/python --fail-on high` | CodeQL `python` |
| Rust | Not supported by SecureAI-Scan | CodeQL `rust` |
| Go | Not supported by SecureAI-Scan | CodeQL `go` |
| Java | Not supported by SecureAI-Scan | CodeQL `java-kotlin` |
| C# | Not supported by SecureAI-Scan | CodeQL `csharp` |

Tool versions are in .github/versions.env.

## Performance

Each contract run reports stage timings and uploads a CSV artifact. The previous five-sample runner measured a **304s cold total** and **201s warm median** (200–205s range); cached build time fell from 91s to 2s. Treat those numbers as a pre-Testcontainers reference, not an SLA. Re-run the manual benchmark on Ubuntu 24.04 and 26.04 before comparing the new orchestration. See the [run report](https://github.com/shoman2020/oas-polycontract/actions/runs/44146642941), [performance view](https://shoman2020.github.io/oas-polycontract/#performance), and [Phase 12](ROADMAP.md#phase-12--performance-baseline).

## Project structure

| Path | Purpose |
|---|---|
| openapi/ | Root contract and compatibility baseline |
| contracts/events/ | AsyncAPI examples |
| demo/ | Product, Order, Inventory, WireMock, and mock data |
| legacy/ | Postman and Bruno collections adapted from project contracts |
| clients/ | Rust, Go, Python, JS, TS, Java, C#, Playwright |
| clients/rust/Cargo.lock; clients/go/go.sum; clients/csharp/packages.lock.json | Rust, Go, and .NET dependency locks |
| gates/ | Lint and compatibility checks |
| evals/ | Documentation, roles, and pipeline checks |
| docs/project-flow.html | Interactive showcase source, published on GitHub Pages |
| .github/workflows/ | Contract, security, performance, and showcase automation |
| .github/versions.env | Central tool and runtime version pins |
| pipeline/; run.sh | Testcontainers pipeline runner and local/CI entry point |

## Contribute

Have a feature idea or found a bug? [Open an issue](https://github.com/shoman2020/oas-polycontract/issues). Include reproduction steps, expected and actual results, and useful logs. See [CONTRIBUTING.md](CONTRIBUTING.md).
