# Roadmap

One reviewed specification contract per API boundary. Clear ownership means less maintenance and more trust.

## Status — 20 November 2026

| Area | Delivered | Remaining |
|---|---|---|
| Contracts | OAS for HTTP; AsyncAPI 3.1 examples for WebSocket and Kafka | Runtime event tests need a provider or broker |
| Tests | Specmatic provider verification, Smart Mock development checks, WireMock, stateful and stateless fuzzing, provider/Spectral/oasdiff ERR-level failure canaries, seven-language error-path suites, and service unit tests; [contract run 44635628482 passed](https://github.com/shoman2020/oas-polycontract/actions/runs/44635628482) | Pilot against representative company APIs |
| Legacy migration | Project-specific Postman and Bruno collections follow Product and Order OAS | Import team-owned history if teams provide their collections |
| Security | CodeQL, Gitleaks, Trivy, Dependency Review, Dependabot, and SecureAI-Scan. Trivy scans the prepared Specmatic runtime after a pinned Wolfi OpenJDK update. | No SBOM artifact or license policy; GenAI controls are manual demos and no application AI runtime exists |
| Dependencies | Cargo, Go, NuGet, npm, Python, Maven, and Testcontainers pins or locks; minimatch alert #3 fixed | Replace the Picomatch patch when upstream publishes a fix |
| Performance | Pre-Testcontainers [five-sample reference](https://github.com/shoman2020/oas-polycontract/actions/runs/44146642941): 304s cold, 201s warm median (200–205s range), build 91s cold and 2s warm | Dispatch the manual Ubuntu 24.04/26.04 matrix after Testcontainers migration |
| Merge governance | Active [`main` ruleset](https://github.com/shoman2020/oas-polycontract/settings/rules/27679805) requires 20 contract, native-suite, and security checks; latest main runs passed | PR-only merging and required code-owner review are not enabled |
| Enterprise adoption | Scope limits and a selective local language-suite option are documented | Pilot with authenticated collection APIs, consumer-owned contracts, approved OAS feature/runtime matrices, and production-like environments |
| Showcase | Interactive contract, test-role, pipeline, workflow, and performance views; current source published by [run 44349546414](https://github.com/shoman2020/oas-polycontract/actions/runs/44349546414) | — |

See the [README](README.md) for the test model and contract release guidance.

Open work includes the post-Testcontainers performance matrix (Phase 12), runtime event coverage, pilot-dependent decisions (Phase 17), structural Testcontainers checks (Phase 19), and governance or supply-chain choices in Conditional work.

## Phases

### Phase 0 — Scaffold
- [x] Repository, ownership, contribution guide, and shared runner.

### Phase 1 — Contract source
- [x] Keep the reviewed Catalog OAS as a design scaffold, separate from provider compatibility baselines.
- [x] Add separate runnable Product, Order, and Inventory contracts.
- [x] Add reviewed compatibility snapshots for each runnable provider.
- [x] Keep the repository contract-first; candidate-spec generation is unnecessary while code does not generate the root OAS.

### Phase 2 — Contract governance
- [x] Lint OAS and AsyncAPI and compare Product, Order, and Inventory against provider-specific compatibility snapshots.
- [x] Run Specmatic and native-suite canaries that prove a schema-invalid Product provider fails.
- [x] Run Spectral and oasdiff canaries that prove a lint violation and ERR-level breaking change fail their gates.
- [x] Run provider, consumer Smart Mock, downstream, examples, stateless fuzz, and stateful checks.
- [x] Track main-branch enforcement in Phase 10.

### Phase 3 — Native clients
- [x] Add Rust, Go, Python, JavaScript, TypeScript, Java, and C# API suites.
- [x] Cover Product and stateful Order flows in the seven native languages.
- [x] Run Product 404, invalid UTF-8 path, and malformed-upstream 502 cases in all seven native suites.
- [x] Run Order 400, idempotent updates, 409 conflict/state preservation, post-delete 404, and unsupported-method 405 cases in all seven native suites.
- [x] Add focused Rust self-tests and C# conformance tests for nullable values, `exclusiveMinimum`, and nested local references.
- [x] Separate provider verification, consumer Smart Mock checks, and live API tests; add Playwright API examples.
- [x] Add separate Product and Order Cucumber step files; Cucumber reads each API's scenario data and validates live responses against OAS.
- [x] Generate shared scenario data from Gherkin and consume it in all seven native language suites.
- [x] Encapsulate HTTP details in per-API clients and add language-appropriate interfaces or composition.
- [x] Add matching service unit tests and run them before pipeline contract gates; repository evaluations check scenario-to-unit-test mapping.

### Phase 4 — Debug views
- [x] Add optional Swagger UI and Prism views of the root OAS.

### Phase 5 — Legacy migration
- [x] Add project-specific Postman and Bruno collections for Product and Order.
- [x] Document import, local service startup, and request order.
- [x] Evaluate collection paths and methods against OAS.
- [x] Keep team-owned history migration conditional on receiving source collections.

### Phase 6 — Local and CI pipeline
- [x] Run checks through `bash ./run.sh` and the Node.js Testcontainers runner.
- [x] Use an isolated network, health checks, one-shot tasks, and cleanup on success or failure.
- [x] Support Ubuntu CI and local Docker Desktop or Colima with the documented shell setup.
- [x] Validate all tool and client runtime pins before container startup.
- [x] Share Testcontainers setup for service and one-shot containers while keeping their readiness strategies explicit.
- [x] Run pinned upstream language runtimes instead of project-specific Dockerfiles; install dependencies and write build outputs in temporary container workspaces.
- [x] Mount contracts, fixtures, and client source read-only so test execution cannot mutate OAS files.
- [x] Run Gherkin-driven Cucumber acceptance tests and isolated service unit tests in CI.

### Phase 7 — Security
- [x] Run CodeQL, Gitleaks, Trivy, Dependency Review, and weekly Dependabot.
- [x] Add OWASP SecureAI-Scan with SARIF upload.
- [x] Verify the scanner against a temporary vulnerable TypeScript example; require HIGH AI001 and retain its SARIF artifact.
- [x] Verify Semgrep prompt-to-system-message rules against temporary Rust, Go, Java, and C# examples; retain their SARIF artifact.
- [x] Keep image scans in contract CI and filesystem scans in security CI.
- [x] Upgrade Specmatic's Wolfi OpenJDK packages to the centrally pinned fixed release before use, then scan the prepared image archive.

### Phase 8 — Documentation and evaluation
- [x] Use the README as the canonical overview, testing model, and glossary.
- [x] Keep the client guide focused on frameworks, validators, and source files.
- [x] Map contract, service, client, orchestration, configuration, and gate ownership in the README.
- [x] Check documentation links, structure, test roles, workflows, and roadmap phases in repository evaluations.
- [x] Document the BDD acceptance and TDD service-test workflow in the README and client guide.

### Phase 9 — Reproducible dependencies
- [x] Commit Cargo, Go, and NuGet locks; enforce locked Rust/.NET and read-only Go builds.
- [x] Pin or lock npm, Python, Maven, and Testcontainers dependencies.
- [x] Keep the Picomatch patch hashed in the lockfile and test its regression case.
- [x] Fix minimatch alert #3 through glob 14.0.6, resolving patched minimatch 11.0.9.

### Phase 10 — Merge policy
- [x] Activate repository ruleset [27679805](https://github.com/shoman2020/oas-polycontract/settings/rules/27679805) for `main`; it requires all 20 verified contexts: `contract-examples (ubuntu-26.04)`, `Native API suite (rust)`, `(go)`, `(python)`, `(js)`, `(ts)`, `(java)`, `(csharp)`, `(playwright)`, `CodeQL (go)`, `(java-kotlin)`, `(python)`, `(csharp)`, `(javascript-typescript)`, `(rust)`, `(actions)`, `Secret scan`, `Dependency and configuration scan`, `Dependency review`, and `OWASP GenAI scan`. It also blocks deletion and force-pushes. PR-only merging and required code-owner review are not enabled.

### Phase 11 — Showcase publishing
- [x] Publish the interactive showcase with GitHub Actions.

### Phase 12 — Performance baseline
- [x] Report per-stage timings in the contract summary and CSV artifact.
- [x] Add a manual one-cold/four-warm matrix for Ubuntu 24.04 and 26.04.
- [ ] Run the matrix after Testcontainers migration and record comparable results before setting thresholds.

### Phase 13 — Optional scaffolder
- [x] Assess package fit; defer `create-polycontract` because the project is a reference template without a runtime API.
- [x] Revisit only if users need selective starters. A GitHub template already seeds the full project.

### Phase 14 — Public-use hardening
- [x] Keep pipeline services on a private Testcontainers network without host port publication.
- [x] Mount only required contract, fixture, and lint paths read-only.
- [x] Use explicit pinned upstream runtime images; no local project images need building or registry-name protection.
- [x] Disable persisted checkout credentials and evaluate these protections.

### Phase 15 — Testcontainers orchestration
- [x] Replace Compose-based CI orchestration with a Node.js Testcontainers runner.
- [x] Keep tool versions centralized and run language suites with pinned upstream runtimes and shared shell setup.
- [x] Remove project-specific Dockerfiles; use read-only source mounts and temporary dependency/build directories.
- [x] Run the updated pipeline after these changes; [contract run 44563995399 passed](https://github.com/shoman2020/oas-polycontract/actions/runs/44563995399).
- [x] Run feature-driven Cucumber acceptance tests in a pinned Node.js Testcontainer.

### Phase 16 — Pipeline configuration
- [x] Reject malformed, duplicate, and missing tool/client runtime pins.
- [x] Derive required client runtime pins from the image build matrix.
- [x] Test pin parsing and run the tests before container startup.

### Phase 17 — Enterprise adoption
- [x] Distinguish live provider verification, consumer development against a provider Smart Mock, and live API integration tests; document that no consumer-owned contract is published.
- [x] Scope Rust and C# validator adapters with conformance tests and document that language validators do not provide identical OAS coverage; C# rejects unsupported external schema references before resolution.
- [x] Keep OAS inputs read-only and document immutable version pinning for separate provider and consumer repositories.
- [x] Scope in-memory Order data to each app instance, use UUID identifiers, test concurrent creation and per-instance isolation, and document that replicas do not share state.
- [x] Allow local runs to select native suites with `POLYCONTRACT_NATIVE_CLIENTS`; CI runs seven language suites and Playwright as separate matrix jobs.
- [x] Keep SecureAI and Semgrep positive-control fixtures manual while scanning repository source on regular security triggers.
- [ ] Pilot with representative company APIs, auth flows, pagination, error cases, versioning, and real downstream dependencies.
- [ ] Agree an OAS feature support matrix and the validator strategy for each supported language.
- [ ] Add consumer-owned contracts and provider verification if pilot teams need consumer-specific expectations checked.
- [ ] Validate the approved company runtime matrix and isolated test-environment requirements.

### Phase 18 — Isolated stack CI
- [x] Keep the full sequential pipeline as the local default; add `core` and `native` profiles for CI.
- [x] Run shared contract, compatibility, provider, fuzz, BDD, and mock gates once before the native suite matrix.
- [x] Run Rust, Go, Python, JavaScript, TypeScript, Java, C#, and Playwright in separate jobs, each with its own Testcontainers network.
- [x] Publish a core timing artifact and one timing artifact per stack.
- [x] Export the generated Node test runtime to a tar archive before Testcontainers cleanup so Trivy can scan the exact runtime built by the pipeline.
- [x] Pair the `inventory-malformed` request example with its documented 502 response.
- [x] Run the shared core gates and confirm the Specmatic example warning is gone; see run 44570728787.
- [x] Verify Trivy scans the exported image archive and all eight isolated native matrix jobs pass; [contract run 44623074864](https://github.com/shoman2020/oas-polycontract/actions/runs/44623074864).

### Phase 19 — Documentation and evaluation quality
- [x] Replace manual collection setup that referenced removed Dockerfiles with pinned WireMock and host Node.js commands.
- [x] Audit fenced Markdown shell examples for local scripts, source files, Docker build contexts, and static bind paths.
- [x] Document that source-marker evaluations are guardrails, not behavior proofs.
- [ ] Replace source-text Testcontainers assertions with structured or behavior-based checks where practical.

## Conditional work

These items need an external input or repository setting before implementation:

| Work | Prerequisite |
|---|---|
| Compare runner performance | Maintainer dispatches the manual workflow. |
| Validate enterprise adoption | A pilot team supplies representative API contracts and approved runtime requirements. |
| Add AsyncAPI runtime coverage | The repository has no event publisher; include a demo provider and broker/server when that example is ready to be maintained. |
| Configure environment URLs | A deployed API environment exists. |
| Add consumer-owned contracts | Consumer owners supply their actual expectations and provider verification rules. |
| Migrate historic requests | The owning team supplies Postman/Bruno exports. |
| Refine Testcontainers fitness checks | Replace source-marker assertions with structural or behavior-based checks before applying them as company policy. |
| Require PR-only merges and code-owner review | Repository owner decides whether checks must run through reviewed pull requests; consider path-specific owners if API and tooling ownership separates. |
| Add auth and collection API examples | Choose an authentication scheme and representative collection behavior with the pilot team. |
| Measure test coverage | Choose language scope, report format, and thresholds before adding a gate. |
| Publish SBOMs | Define artifact scope, format, retention, and consumers. |
| Enforce license policy | Legal or architecture owners provide an approved license policy. |
| Add issue and PR templates | Decide which fields public bug and feature reports must include. |

## Package fit

This reference repo has no stable runtime API to package. A `create-polycontract` CLI may help if users request selective starters; npm would add a release lifecycle that a GitHub template does not need. See [GitHub template repositories](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-template-repository) and [npm publishing](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/).

## Specification diagnostics

The latest [main contract run 44635628482](https://github.com/shoman2020/oas-polycontract/actions/runs/44635628482) passed. Before the CI split, run [44565579793](https://github.com/shoman2020/oas-polycontract/actions/runs/44565579793) reported zero Spectral errors and no breaking changes. Its Specmatic example warning was fixed by pairing the malformed Inventory request with a 502 response; [run 44570728787](https://github.com/shoman2020/oas-polycontract/actions/runs/44570728787) confirmed the warning was gone. Negative canaries intentionally show rejection of invalid Product responses.

## Progress

- 20 Nov: Enabled main ruleset [27679805](https://github.com/shoman2020/oas-polycontract/settings/rules/27679805) with 20 required checks. Post-merge contract [44635628482](https://github.com/shoman2020/oas-polycontract/actions/runs/44635628482) and security [44635628479](https://github.com/shoman2020/oas-polycontract/actions/runs/44635628479) runs passed. Removed Dependabot Docker updates for retired paths, added the Markdown shell-path audit, and verified the timeout test plus Spectral/oasdiff ERR-level canaries in PR contract [44643172422](https://github.com/shoman2020/oas-polycontract/actions/runs/44643172422) and security [44643172446](https://github.com/shoman2020/oas-polycontract/actions/runs/44643172446). Restricted contract push runs to `main` and separated concurrency by event to prevent cancelled duplicate PR checks. Added bounded retries to both CI and Testcontainers WireMock downloads while retaining SHA-256 validation.
- 19 Nov: Split contract CI into shared gates and isolated jobs for seven language suites plus Playwright. All eight suites and the Trivy scans passed in [run 44573964063](https://github.com/shoman2020/oas-polycontract/actions/runs/44573964063).
- 19 Nov: Added Gherkin-driven scenarios, generated shared case data, negative canaries, error-path coverage, validator conformance cases, and fail-fast stage summaries. The full contract run [44563995399](https://github.com/shoman2020/oas-polycontract/actions/runs/44563995399) passed.
