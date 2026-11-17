# Roadmap

One hand-edited contract per API boundary. Clear ownership means less maintenance and more trust. Providers and consumers use the same contract revision; WireMock mappings represent a downstream dependency.

## Status — 17 November 2026

| Area | Current state | Gap |
|---|---|---|
| Runnable APIs | Product, Order, Inventory, WireMock, and Specmatic examples | Contract run [44075851175](https://github.com/shoman2020/oas-polycontract/actions/runs/44075851175) failed in Java Maven Enforcer. This patch aligns Jackson dependencies and pins lifecycle plugins. |
| Test roles | Specmatic provider targets the app; JS and Playwright consumers target Smart Mock; seven languages plus Playwright run API integration tests | Re-run CI after the Maven fix. Last full green run: [44052746009](https://github.com/shoman2020/oas-polycontract/actions/runs/44052746009). |
| Contracts | OAS for HTTP, AsyncAPI examples for WebSocket and Kafka; Spectral, oasdiff, Schemathesis | Event examples have no live provider or broker. |
| Security | CodeQL, Gitleaks, Trivy, Dependency Review, Dependabot; OWASP SecureAI-Scan added to security.yml | GenAI scan awaits CI verification. It supports Python, JavaScript, and TypeScript; this demo has no AI runtime. |
| Showcase | Interactive contract, pipeline, workflow, test-role, and performance views | GitHub Pages is not enabled in repository settings. |
| Reproducibility | npm and Python locks; Maven convergence and plugin versions enforced | Add Rust Cargo.lock, Go go.sum, and C# NuGet lock mode; verify a clean run. |

## Test model

- **Provider contract test:** Specmatic sends contract-derived requests to the live Product API.
- **Consumer contract test:** JS and Playwright check expectations against a Specmatic Smart Mock generated from Product OAS.
- **API integration test:** Native clients and Playwright call live Product or Order APIs, validate OAS responses, then check behavior.
- **Downstream integration:** The Product API calls WireMock; the suite checks its request journal.
- **Stateless fuzzing:** Schemathesis generates independent Product API requests. The documented 502 is allowed only for unavailable inventory.
- **Stateful testing:** Schemathesis and seven native suites follow linked create/read/confirm/delete operations in a separate in-memory Order API.

## Phases

### Phase 0 — Scaffold
- [x] Repository structure, ownership, contribution guide, runner.

### Phase 1 — Contract source
- [x] Hand-edited root Catalog OAS and compatibility baseline.
- [x] Separate runnable Product, Order, and Inventory contracts.
- [ ] Generate a candidate spec before compatibility checks if the root contract becomes code-first.

### Phase 2 — Governance
- [x] Lint OAS and AsyncAPI; compare the root OAS with its baseline.
- [x] Run Specmatic provider, consumer-mock, downstream, and external-example checks.
- [x] Run stateless and stateful Schemathesis.
- [ ] Require contract and security checks in GitHub branch protection.

### Phase 3 — Native clients
- [x] Rust, Go, Python, JavaScript, TypeScript, Java, and C# validate live responses against OAS.
- [x] Add Product and stateful Order scenarios in all seven languages.
- [x] Separate provider, consumer-mock, and live API integration suites.
- [x] Add Playwright provider and consumer examples.

### Phase 4 — Debug views
- [x] Add optional Swagger UI and Prism views of the root OAS.
- [ ] Configure environment URLs when deployments exist.

### Phase 5 — Legacy migration
Not applicable until a Postman or Bruno collection is provided. If supplied, map requests to OAS and port business assertions to one native suite.

### Phase 6 — Local and CI pipeline
- [x] Run applicable checks through bash ./run.sh and Docker Compose.
- [x] Run GitHub Actions on Ubuntu; support Docker Desktop or Colima on macOS.
- [x] Remove Compose services after success or failure.

### Phase 7 — Security
- [x] CodeQL for Rust, Go, Python, JS/TS, Java, C#, and Actions; Gitleaks and Trivy scans.
- [x] Run Dependency Review on pull requests and Dependabot weekly.
- [x] Add OWASP SecureAI-Scan with a high-severity gate and SARIF upload.
- [ ] Verify the scan and Maven fix in a green contract/security run.

### Phase 8 — Documentation and evaluation
- [x] Align README, client guide, project map, and test roles.
- [x] Check links, project structure, test sources and targets, workflow visuals, and phase sequence.
- [ ] Verify Compose from a clean checkout.
- [ ] Enable GitHub Pages with Actions.

### Phase 9 — Reproducible dependencies
- [x] Lock JavaScript, TypeScript, Playwright, and Python installs.
- [x] Enforce Maven dependency convergence and explicit plugin versions.
- [ ] Commit Rust Cargo.lock and run cargo test --locked.
- [ ] Commit Go go.sum and use read-only module builds.
- [ ] Enable C# NuGet lock-file generation and locked restore.
- [ ] Pass the full contract workflow from a clean checkout.

### Phase 10 — Merge policy
- [ ] Require contract and security checks on pull requests.
- [ ] Verify failed checks block merges and selected checks remain stable.

### Phase 11 — Showcase publishing
- [ ] Enable Pages with GitHub Actions.
- [ ] Confirm the README link loads the published showcase.

### Phase 12 — Performance baseline
- [x] Record one full pipeline diagnostic: about 6m 27s in green run 44052746009; an earlier fuzz run produced 115 cases in 2.07s.
- [ ] Capture at least five cold and warm runs with stage timings.
- [ ] Report median and range; keep thresholds informational until there are enough samples.

### Phase 13 — Optional reusable scaffolder
- [ ] Gather maintainer needs and starter combinations after Phases 9 and 10.
- [ ] If selective generation is needed, build create-polycontract with safe init and additive add commands.
- [ ] Preserve hand-edited files and verify generated starters with the same pipeline.
- [ ] Test the packaged CLI in a clean project before publishing.

## Remaining work

1. Re-run CI to verify the Java fix and OWASP GenAI scan.
2. Add Rust, Go, and C# dependency locks; pass the clean pipeline.
3. Configure required GitHub checks and enable Pages.
4. Collect performance samples before setting a regression threshold.
5. Add event runtime checks only with a provider or broker; configure debug URLs when environments exist.
6. Migrate legacy requests only when supplied. Keep MCP optional until a concrete use case exists.

## Package suitability

This is a multi-language reference project, not an importable library. Publishing the full repository as an npm package would not expose a stable runtime API.

A create-polycontract npm CLI could follow if users need selective project generation. GitHub template repositories seed projects from existing files and structure; npm publishing adds package testing and release work. This is an assessment of the current project structure: [GitHub templates](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-template-repository) · [npm publishing](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/).

## Progress

- 17 Nov: Workflows ran for commit 7361ee4. Security and showcase passed; contract failed at Maven convergence and implicit lifecycle plugin versions. This patch addresses both and adds the OWASP GenAI gate.
- Earlier full green contract run: [44052746009](https://github.com/shoman2020/oas-polycontract/actions/runs/44052746009).
