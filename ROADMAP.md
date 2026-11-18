# Roadmap

One reviewed specification contract per API boundary. Clear ownership means less maintenance and more trust.

## Status — 18 November 2026

| Area | Delivered | Remaining |
|---|---|---|
| Contracts | OAS for HTTP; AsyncAPI 3.1 examples for WebSocket and Kafka | Runtime event tests need a provider or broker |
| Tests | Specmatic provider and consumer, WireMock, stateless fuzzing, stateful flows, seven native languages, Playwright; [contract run 44325433591 passed](https://github.com/shoman2020/oas-polycontract/actions/runs/44325433591) | — |
| Legacy migration | Project-specific Postman and Bruno collections follow Product and Order OAS | Import team-owned history if teams provide their collections |
| Security | CodeQL, Gitleaks, Trivy, Dependency Review, Dependabot, OWASP SecureAI-Scan; [security run 44325434450 passed](https://github.com/shoman2020/oas-polycontract/actions/runs/44325434450) | No application AI runtime; CI verifies SecureAI-Scan with a temporary positive-control example |
| Dependencies | Cargo, Go, NuGet, npm, Python, Maven, and Testcontainers pins or locks; minimatch alert #3 fixed | Replace the Picomatch patch when upstream publishes a fix |
| Performance | Pre-Testcontainers [five-sample reference](https://github.com/shoman2020/oas-polycontract/actions/runs/44146642941): 304s cold, 201s warm median (200–205s range), build 91s cold and 2s warm | Dispatch the manual Ubuntu 24.04/26.04 matrix after Testcontainers migration |
| Showcase | Interactive contract, test-role, pipeline, workflow, and performance views; last published by [run 44260518106](https://github.com/shoman2020/oas-polycontract/actions/runs/44260518106) | Publish the current source after merge |

The shared test vocabulary and examples are in the [README testing model](README.md#testing-model-and-terminology). This roadmap tracks delivery and prerequisites; it is not a second testing guide.

## Phases

### Phase 0 — Scaffold
- [x] Repository, ownership, contribution guide, and shared runner.

### Phase 1 — Contract source
- [x] Keep the reviewed Catalog OAS as the compatibility baseline.
- [x] Add separate runnable Product, Order, and Inventory contracts.
- [x] Keep the repository contract-first; candidate-spec generation is unnecessary while code does not generate the root OAS.

### Phase 2 — Contract governance
- [x] Lint OAS and AsyncAPI and check root compatibility.
- [x] Run provider, consumer-mock, downstream, examples, stateless fuzz, and stateful checks.
- [x] Record the remaining repository merge-policy setting in Phase 10.

### Phase 3 — Native clients
- [x] Add Rust, Go, Python, JavaScript, TypeScript, Java, and C# API suites.
- [x] Cover Product and stateful Order flows in the seven native languages.
- [x] Separate provider, consumer-mock, and live API tests; add Playwright API examples.

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

### Phase 7 — Security
- [x] Run CodeQL, Gitleaks, Trivy, Dependency Review, and weekly Dependabot.
- [x] Add OWASP SecureAI-Scan with SARIF upload.
- [x] Verify the scanner against a temporary vulnerable TypeScript example; require HIGH AI001 and retain its SARIF artifact.
- [x] Keep image scans in contract CI and filesystem scans in security CI.

### Phase 8 — Documentation and evaluation
- [x] Use the README as the canonical overview, testing model, and glossary.
- [x] Keep the client guide focused on frameworks, validators, and source files.
- [x] Map contract, service, client, orchestration, configuration, and gate ownership in the README.
- [x] Check documentation links, structure, test roles, workflows, and roadmap phases in repository evaluations.

### Phase 9 — Reproducible dependencies
- [x] Commit Cargo, Go, and NuGet locks; enforce locked Rust/.NET and read-only Go builds.
- [x] Pin or lock npm, Python, Maven, and Testcontainers dependencies.
- [x] Keep the Picomatch patch hashed in the lockfile and test its regression case.
- [x] Fix minimatch alert #3 through glob 14.0.6, resolving patched minimatch 11.0.9.

### Phase 10 — Merge policy
- [ ] Require contract and security checks in branch protection and verify failures block merges. This requires a repository administrator.

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
- [x] Never pull same-named registry images for local project images.
- [x] Disable persisted checkout credentials and evaluate these protections.

### Phase 15 — Testcontainers orchestration
- [x] Replace Compose-based CI orchestration with a Node.js Testcontainers runner.
- [x] Keep tool versions centralized and runtime requirements consistent.
- [x] Pass the pipeline after migration; [contract run 44325433591 passed](https://github.com/shoman2020/oas-polycontract/actions/runs/44325433591).

### Phase 16 — Pipeline configuration
- [x] Reject malformed, duplicate, and missing tool/client runtime pins.
- [x] Derive required client runtime pins from the image build matrix.
- [x] Test pin parsing and run the tests before container startup.

## Conditional work

These items need an external input or repository setting before implementation:

| Work | Prerequisite |
|---|---|
| Enforce required checks | Repository administrator configures branch protection. |
| Compare runner performance | Maintainer dispatches the manual workflow. |
| Test WebSocket or Kafka runtime | A service implementation and broker/server are available. |
| Configure environment URLs | A deployed API environment exists. |
| Migrate historic requests | The owning team supplies Postman/Bruno exports. |

## Package fit

This reference repo has no stable runtime API to package. A `create-polycontract` CLI may help if users request selective starters; npm would add a release lifecycle that a GitHub template does not need. See [GitHub template repositories](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-template-repository) and [npm publishing](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/).

## Progress

- 18 Nov: Added a SecureAI-Scan positive control. Version 0.13.0 detected `HIGH AI001` in the temporary example; CI verified the SARIF, recorded the finding, uploaded the artifact, and passed the clean project scan.
- 18 Nov: Added strict, tested pipeline version validation; pin requirements now derive from the client build matrix.
- 18 Nov: Contract and security pull request runs passed: [contract 44325433591](https://github.com/shoman2020/oas-polycontract/actions/runs/44325433591), [security 44325434450](https://github.com/shoman2020/oas-polycontract/actions/runs/44325434450). The aggregate CodeQL check reports a configuration warning; language jobs passed.
- 18 Nov: Consolidated testing terminology in the README glossary; the client guide links to that source and retains only framework mappings and test entry points.
- 18 Nov: Added an architecture map for contracts, demo services, native clients, orchestration, configuration, and quality checks.
