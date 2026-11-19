# Roadmap

One reviewed specification contract per API boundary. Clear ownership means less maintenance and more trust.

## Status — 19 November 2026

| Area | Delivered | Remaining |
|---|---|---|
| Contracts | OAS for HTTP; AsyncAPI 3.1 examples for WebSocket and Kafka | Runtime event tests need a provider or broker |
| Tests | Specmatic provider verification, consumer development against a provider Smart Mock, WireMock, stateful and stateless fuzzing, negative canaries, seven-language error-path suites driven by shared Gherkin data, and isolated service unit tests; [Testcontainers contract run 44558869057 passed](https://github.com/shoman2020/oas-polycontract/actions/runs/44558869057) | Pilot against representative company APIs |
| Legacy migration | Project-specific Postman and Bruno collections follow Product and Order OAS | Import team-owned history if teams provide their collections |
| Security | CodeQL, Gitleaks, Trivy, Dependency Review, Dependabot, and SecureAI-Scan; [adoption implementation run 44349546212 passed](https://github.com/shoman2020/oas-polycontract/actions/runs/44349546212) | GenAI positive controls are manual demos; no application AI runtime |
| Dependencies | Cargo, Go, NuGet, npm, Python, Maven, and Testcontainers pins or locks; minimatch alert #3 fixed | Replace the Picomatch patch when upstream publishes a fix |
| Performance | Pre-Testcontainers [five-sample reference](https://github.com/shoman2020/oas-polycontract/actions/runs/44146642941): 304s cold, 201s warm median (200–205s range), build 91s cold and 2s warm | Dispatch the manual Ubuntu 24.04/26.04 matrix after Testcontainers migration |
| Enterprise adoption | Scope limits and a selective local language-suite option are documented | Add consumer-owned contracts, validator coverage, approved runtime matrix, and production-like test environments based on a pilot |
| Review response | Added provider-specific compatibility snapshots, expected-failure canaries, error-path tests, validator conformance cases, and read-only contract mounts; Order IDs use UUIDs with concurrency and instance-isolation tests; C# rejects external nested schema references; failed-run summaries list skipped stages; [contract run 44558869057 passed](https://github.com/shoman2020/oas-polycontract/actions/runs/44558869057) | Broader validator coverage remains pilot work |
| Showcase | Interactive contract, test-role, pipeline, workflow, and performance views; current source published by [run 44349546414](https://github.com/shoman2020/oas-polycontract/actions/runs/44349546414) | — |

The shared test vocabulary and examples are in the [README testing model](README.md#testing-model-and-terminology). Specifications are read-only inputs in CI and are changed only through reviewed source updates. For separate provider and consumer projects, publish an immutable specification artifact and pin its version in both repos.

Two existing CI checklist actions remain: requiring contract and security checks on `main` (Phase 10; branch protection is currently disabled) and running the post-migration performance matrix (Phase 12). Phase 17 tracks broader enterprise adoption work that needs a representative pilot.

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
- [x] Run provider, consumer Smart Mock, downstream, examples, stateless fuzz, and stateful checks.
- [x] Record the remaining repository merge-policy setting in Phase 10.

### Phase 3 — Native clients
- [x] Add Rust, Go, Python, JavaScript, TypeScript, Java, and C# API suites.
- [x] Cover Product and stateful Order flows in the seven native languages.
- [x] Run Product 404, invalid UTF-8 path, and malformed-upstream 502 cases in all seven native suites.
- [x] Run Order 400, idempotent updates, 409 conflict/state preservation, post-delete 404, and unsupported-method 405 cases in all seven native suites.
- [x] Add Rust and C# conformance tests for nullable values, `exclusiveMinimum`, and nested local references.
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
- [ ] Require `contract-examples (ubuntu-26.04)`, all seven CodeQL checks, `Secret scan`, `Dependency and configuration scan`, `Dependency review`, and `OWASP GenAI scan`; verify failures block merges. This requires repository rules access.

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
- [x] Run the updated pipeline after these changes; [contract run 44558869057 passed](https://github.com/shoman2020/oas-polycontract/actions/runs/44558869057).
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
- [x] Allow local runs to select native suites with `POLYCONTRACT_NATIVE_CLIENTS`; CI runs all seven by default.
- [x] Keep SecureAI and Semgrep positive-control fixtures manual while scanning repository source on regular security triggers.
- [ ] Pilot with representative company APIs, auth flows, pagination, error cases, versioning, and real downstream dependencies.
- [ ] Agree an OAS feature support matrix and the validator strategy for each supported language.
- [ ] Add consumer-owned contracts and provider verification if pilot teams need consumer-specific expectations checked.
- [ ] Validate the approved company runtime matrix and isolated test-environment requirements.

## Conditional work

These items need an external input or repository setting before implementation:

| Work | Prerequisite |
|---|---|
| Enforce required checks | Repository administrator configures branch protection. |
| Compare runner performance | Maintainer dispatches the manual workflow. |
| Validate enterprise adoption | A pilot team supplies representative API contracts and approved runtime requirements. |

| Test WebSocket or Kafka runtime | A service implementation and broker/server are available. |
| Configure environment URLs | A deployed API environment exists. |
| Migrate historic requests | The owning team supplies Postman/Bruno exports. |

## Package fit

This reference repo has no stable runtime API to package. A `create-polycontract` CLI may help if users request selective starters; npm would add a release lifecycle that a GitHub template does not need. See [GitHub template repositories](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-template-repository) and [npm publishing](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/).

## Progress

- 19 Nov: Consolidated Testcontainers container configuration and service health checks to remove duplicated builder and readiness setup. Service health and one-shot completion strategies remain distinct.
- 19 Nov: Run 44557734234 exposed a missing comma in UUID Order ID generation; the object literal was fixed and the complete Testcontainers contract run 44558869057 passed. The README and interactive flow show two Gherkin paths: API-specific Cucumber steps run source features against live services, while the generator exports shared JSON consumed by the seven native suites. Tools and languages are examples with suggested migration options.
- 19 Nov: Run 44552231115 exposed a missing npm pin in JavaScript and Playwright consumer containers. Both received `NPM_VERSION`; the complete follow-up contract run 44558869057 passed.
- 19 Nov: Applied the review follow-up: UUID Order identifiers with concurrency/isolation tests, fail-closed nested external C# schema references, explicit Catalog-versus-Product boundary descriptions, `.nvmrc` setup guidance, and skipped-stage reporting after fail-fast errors. Contract run 44558869057 passed. Consumer-owned contracts, event runtime tests, branch protection, post-migration performance, and broader validator coverage remain open for their listed prerequisites.

- 19 Nov: Run 44549893064 passed evaluations and all contract/provider/fuzz/stateful stages; the C# 405 assertion then read `Allow` from the wrong .NET header collection. It now reads `Content.Headers.Allow`. Also fixed xUnit's cancellation-token analyzer warning and added an evaluation guard for the header location. CI rerun pending.

- 19 Nov: Contract run passed evaluations, contracts, provider checks, fuzzing, and stateful tests, then failed in C# because .NET 10 selected VSTest for an xUnit v3 Microsoft.Testing.Platform project. Added a C# `global.json` selecting MTP, runs the test commands from that configured workspace, and guards this setup in repository evaluations. Pipeline rerun pending.

- 19 Nov: CodeQL run 44495112186 completed every language job after WireMock staging moved to a private temporary directory, exclusive 0600 file creation, a size cap, pinned SHA-256 verification, and cleanup. Contract run 44495112117 stopped at the generated acceptance-data freshness check; commit 82a43f5 regenerated the JSON from the feature files. Contract verification is pending.

- 19 Nov: Contract run 44490734374 passed setup, evaluations, provider checks, fuzzing, and six native suites, then exposed Java invalid-input tests being rejected by the outbound OAS filter. Those tests now bypass request validation only for intentionally malformed inputs and assert responses from shared feature data. Aligned the npm engine pin, explicitly denied unused npm scripts, removed forced cache cleanup, and added the SLF4J no-op provider. WireMock staging now uses a private temp directory, exclusive descriptor, size bound, pinned SHA-256, and cleanup. Contract and CodeQL reruns are pending.

- 19 Nov: Expanded Product and Order Gherkin scenarios across all seven native suites, including error paths and repeated state transitions. Split JavaScript Cucumber steps by API, kept generated scenario data in sync with feature files, and refactored API clients around encapsulated transport and language-appropriate interfaces. Pipeline configuration and repository evaluations pass locally; the full Testcontainers pipeline remains unverified.
- 19 Nov: The first Testcontainers run reached provider checks but timed out waiting for a WireMock log message that its current runtime did not emit. Replaced it with process startup plus an HTTP readiness probe, and made the deliberately broken provider handle invalid UTF-8 input without crashing. The contract pipeline is being rerun.
- 19 Nov: The rerun passed provider verification, WireMock checks, fuzzing, and Rust integration tests. Go compilation found that one test declared its API interface but called the concrete client; the test now exercises the interface. CI rerun is pending.
- 19 Nov: The next run passed WireMock, provider verification, fuzzing, Rust, Go, Python, and JavaScript. TypeScript compilation found a missing `acceptanceCases` export; it has been added and CI will verify the remaining suites.
- 19 Nov: The third run confirmed the new TypeScript selector is used but found missing `api`, `feature`, and `scenario` fields in the TypeScript case type. The type now matches generated acceptance data; CI rerun is pending.
- 18 Nov: Applied the review findings: clarified that provider-spec Smart Mock checks do not capture consumer-owned expectations, documented enterprise adoption requirements and validator limits, isolated Order state per app instance, added selective local language suites, moved positive controls to manual runs, and corrected stale Compose references. Local evaluation passed 13/13, pipeline configuration tests passed 6/6, and the [contract](https://github.com/shoman2020/oas-polycontract/actions/runs/44349546211), [security](https://github.com/shoman2020/oas-polycontract/actions/runs/44349546212), and [showcase](https://github.com/shoman2020/oas-polycontract/actions/runs/44349546414) workflows passed.
- 18 Nov: Branch protection remains disabled; the post-migration benchmark still needs a manual dispatch.
- 18 Nov: Added a SecureAI-Scan positive control. Version 0.13.0 detected `HIGH AI001` in the temporary example; CI verified the SARIF, recorded the finding, uploaded the artifact, and passed the clean project scan.
- 18 Nov: Added Semgrep taint-rule examples for prompt-to-system-message flows in Rust, Go, Java, and C#. The custom rules target a defined pattern and need SDK-specific source/sink tuning in applications.
- 18 Nov: Added strict, tested pipeline version validation; pin requirements now derive from the client build matrix.
- 18 Nov: Contract and security pull request runs passed: [contract 44325433591](https://github.com/shoman2020/oas-polycontract/actions/runs/44325433591), [security 44325434450](https://github.com/shoman2020/oas-polycontract/actions/runs/44325434450). The aggregate CodeQL check reports a configuration warning; language jobs passed.
- 18 Nov: Consolidated testing terminology in the README glossary; the client guide links to that source and retains only framework mappings and test entry points.
- 18 Nov: Added an architecture map for contracts, demo services, native clients, orchestration, configuration, and quality checks.
