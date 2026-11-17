# Roadmap

One hand-edited contract per API boundary. Clear ownership means less maintenance and more trust. Providers and consumers use the same contract revision; WireMock mappings represent a downstream dependency.

## Status — 17 November 2026

| Area | Current state | Gap |
|---|---|---|
| Runnable APIs | Product, Order, Inventory, WireMock, and Specmatic examples | Contract pipeline passed on [run 44110813231](https://github.com/shoman2020/oas-polycontract/actions/runs/44110813231), including all three container scans. |
| Test roles | Specmatic provider targets the app; JS and Playwright consumers target Smart Mock; seven languages plus Playwright run API integration tests | Provider, consumer, stateful, and integration checks passed in the contract run. |
| Contracts | OAS for HTTP, AsyncAPI 3.1 examples for WebSocket and Kafka; pinned Spectral 6.17, oasdiff, Schemathesis | Event examples have no live provider or broker. Spectral filters only upstream Node warning DEP0040; CI verification pending. |
| Security | CodeQL, Gitleaks, Trivy, Dependency Review, Dependabot, and OWASP SecureAI-Scan | Security workflow [run 44110813201](https://github.com/shoman2020/oas-polycontract/actions/runs/44110813201) passed, including SecureAI-Scan. Its AI-specific rules cover Python, JavaScript, and TypeScript; this demo has no AI runtime. |
| Showcase | Interactive contract, pipeline, workflow, test-role, and performance views | GitHub Pages is not enabled in repository settings. |
| Reproducibility | npm and Python locks; Maven dependency and lifecycle plugin versions are explicitly managed | Add Rust Cargo.lock, Go go.sum, and C# NuGet lock mode; verify a clean run. |

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
- [x] Verify SecureAI-Scan and the Maven fix in green contract and security runs.

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
- [x] Pass the full contract workflow, including app, WireMock, and Specmatic image scans.
- [ ] Verify the workflow from a clean local checkout.

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

1. Add Rust, Go, and C# dependency locks; verify a clean checkout.
2. Configure required GitHub checks and enable Pages.
3. Collect performance samples before setting a regression threshold.
4. Add event runtime checks only with a provider or broker; configure debug URLs when environments exist.
5. Migrate legacy requests only when supplied. Keep MCP optional until a concrete use case exists.

## Package suitability

This is a multi-language reference project, not an importable library. Publishing the full repository as an npm package would not expose a stable runtime API.

A create-polycontract npm CLI could follow if users need selective project generation. GitHub template repositories seed projects from existing files and structure; npm publishing adds package testing and release work. This is an assessment of the current project structure: [GitHub templates](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-template-repository) · [npm publishing](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/).

## Progress

- 17 Nov: Commit 44bd1d9 passed the OWASP GenAI scan, other security jobs, and showcase deployment. Commit baab726 aligned Maven dependency versions after contract run 44081375236 exposed convergence errors. Contract run [44110813231](https://github.com/shoman2020/oas-polycontract/actions/runs/44110813231) and security run [44110813201](https://github.com/shoman2020/oas-polycontract/actions/runs/44110813201) then passed. Repository evaluations passed 8/8 checks.
- 17 Nov: Updated the WebSocket and Kafka examples to AsyncAPI 3.1.0, the version recommended by Spectral; configured Spectral to suppress only its upstream `DEP0040` warning. Contract run verification is pending.
- Earlier full green contract run: [44052746009](https://github.com/shoman2020/oas-polycontract/actions/runs/44052746009).
