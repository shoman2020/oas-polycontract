# Roadmap

One reviewed contract per API boundary. Clear ownership means less maintenance and more trust.

## Status — 17 November 2026

| Area | Delivered | Remaining |
|---|---|---|
| Contracts | OAS for HTTP; AsyncAPI 3.1 examples for WebSocket and Kafka | No event provider or broker |
| Tests | Specmatic provider/consumer, WireMock, stateless fuzzing, stateful workflows, seven native languages, Playwright | Add runtime event examples only with a provider |
| Legacy migration | Project-specific Postman and Bruno collections mapped to Product and Order OAS | Migrate team-owned collections if supplied |
| Security | CodeQL, Gitleaks, Trivy, Dependency Review, Dependabot, OWASP SecureAI-Scan; latest [security run 44162411190](https://github.com/shoman2020/oas-polycontract/actions/runs/44162411190) passed | SecureAI-Scan examples cover JS, TS, and Python; no AI runtime is present |
| Dependencies | Cargo, Go, NuGet, npm, Python, and Maven locks; the Picomatch patch passed the TypeScript regression and CI suites | Replace the patch when upstream publishes a fix |
| Performance | [Five-sample run](https://github.com/shoman2020/oas-polycontract/actions/runs/44146642941): 304s cold, 201s warm median (200–205s range); build 91s cold and 2s warm | Repeat on other runners or cache states before setting thresholds |
| Showcase | Contract, pipeline, workflow, test-role, performance, and Postman/Bruno migration views; [latest deployment passed](https://github.com/shoman2020/oas-polycontract/actions/runs/44159020691) | None |

## Test model

- **Provider contract:** Specmatic sends contract-derived requests to the live Product API.
- **Consumer contract:** JavaScript and Playwright check expectations against the Specmatic Smart Mock generated from Product OAS.
- **API integration:** Native clients call live APIs, validate responses against OAS, then assert behavior.
- **Downstream integration:** The Product API calls WireMock; tests verify its request journal.
- **Stateless fuzzing:** Schemathesis generates independent Product requests; only unavailable inventory allows the documented 502.
- **Stateful testing:** Schemathesis and seven native suites follow linked Order create/read/confirm/delete operations.

## Phases

### Phase 0 — Scaffold
- [x] Repository, ownership, contribution guide, and shared runner.

### Phase 1 — Contract source
- [x] Hand-edited Catalog contract and compatibility baseline.
- [x] Separate runnable Product, Order, and Inventory contracts.
- [ ] Generate a candidate spec before comparison if the root contract becomes code-first.

### Phase 2 — Governance
- [x] Lint OAS and AsyncAPI; check root compatibility.
- [x] Run provider, consumer-mock, downstream, external-example, stateless, and stateful checks.
- [ ] Require contract and security checks in branch protection.

### Phase 3 — Native clients
- [x] Rust, Go, Python, JavaScript, TypeScript, Java, and C# API suites.
- [x] Product and stateful Order coverage in all seven languages.
- [x] Separate provider, consumer-mock, and live API tests; add Playwright examples.

### Phase 4 — Debug views
- [x] Optional Swagger UI and Prism views of the root OAS.
- [ ] Configure environment URLs when deployed environments exist.

### Phase 5 — Legacy migration
- [x] Add project-specific Postman and Bruno collections for Product lookup and the stateful Order flow, based on public collection examples and project OAS.
- [x] Document local service startup, import, and collection run order.
- [x] Check collection methods and paths against the Product and Order OAS in repository evaluations.
- [ ] Convert team-owned historic requests when an original collection is available.

### Phase 6 — Local and CI pipeline
- [x] Run checks through `bash ./run.sh` and Docker Compose.
- [x] Run Ubuntu CI; support Docker Desktop or Colima locally on macOS.
- [x] Remove Compose services after success or failure.

### Phase 7 — Security
- [x] CodeQL for supported source languages and Actions; add Gitleaks and Trivy.
- [x] Add Dependency Review, weekly Dependabot, and OWASP SecureAI-Scan with SARIF upload.
- [x] Keep image scans in contract CI and filesystem scans in security CI.

### Phase 8 — Documentation and evaluation
- [x] Align README, client guide, interactive graphs, roles, and repository evaluations.
- [x] Check links, structure, test sources/targets, workflows, and roadmap phases.
- [x] Run repository evaluations on the current project structure and documentation.

### Phase 9 — Reproducible dependencies
- [x] Commit Cargo, Go, and NuGet locks; enforce locked Rust/.NET and read-only Go builds.
- [x] Keep npm, Python, and Maven dependencies pinned or locked.
- [x] Pass a clean CI run with all lock enforcement enabled.
- [x] Pin npm 12.2.2, apply the lock-hashed Picomatch patch, and pass the regression and TypeScript suites.

### Phase 10 — Merge policy
- [ ] Require contract and security checks on pull requests.
- [ ] Confirm failed checks block merges and required checks stay stable.

### Phase 11 — Showcase publishing
- [x] Publish the interactive showcase with GitHub Actions; latest deployment passed in [run 44159020691](https://github.com/shoman2020/oas-polycontract/actions/runs/44159020691).

### Phase 12 — Performance baseline
- [x] Report per-stage timings in the contract run summary and CSV artifact.
- [x] Add a manual workflow for one cold and four warm pipeline samples.
- [x] Run one cold and four warm samples; record medians and ranges.
- [ ] Repeat on other runners or cache states before setting thresholds.

### Phase 13 — Optional scaffolder
- [ ] Confirm demand before building `create-polycontract`.
- [ ] If useful, generate selected starters without overwriting hand-edited files.
- [ ] Test in a clean project before publishing.

## Next

1. Repeat the performance sample across runners or cache states before setting thresholds.
2. Require contract and security checks in branch protection.
3. Convert team-owned legacy requests when an original collection is supplied; add event runtime examples when a provider exists.
4. Revisit the optional CLI when users need selective starters.

## Package fit

This reference repository has no stable runtime API to package. A `create-polycontract` CLI may help if users need selective starters. GitHub templates already seed repositories; npm adds a test and release lifecycle. This is a recommendation based on the current structure: [GitHub templates](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-template-repository) · [npm publishing](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/).

## Progress

- 17 Nov: Latest [contract run 44162411257](https://github.com/shoman2020/oas-polycontract/actions/runs/44162411257) passed in 4m 57s, with 241s in `run.sh`, 11/11 repository evaluations, all language suites, and image scans green. [Security run 44162411190](https://github.com/shoman2020/oas-polycontract/actions/runs/44162411190) also passed.
- 17 Nov: [Contract run 44146222326](https://github.com/shoman2020/oas-polycontract/actions/runs/44146222326) (#98) passed in 5m 46s with 10/10 repository evaluations and all image scans green. [Security run 44152942046](https://github.com/shoman2020/oas-polycontract/actions/runs/44152942046) (#78) passed, including OWASP GenAI and CodeQL.
- 17 Nov: Updated Go `x/text` to 0.41.0 to resolve Trivy findings and removed the temporary lock-generation workflow. The five-sample performance workflow completed in run 44146642941.
- 17 Nov: Contract run [44152941995](https://github.com/shoman2020/oas-polycontract/actions/runs/44152941995) showed that npm 12 rejects transitive Git overrides. Replaced the override with npm's native, lockfile-hashed patch for the proposed Picomatch fix; contract verification is pending.
- 17 Nov: Added Postman and Bruno collections mapped to Product and Order OAS. Team-owned legacy collection migration remains open until original exports are available.
- 17 Nov: Commit [8af36c2](https://github.com/shoman2020/oas-polycontract/commit/8af36c2e7c0523b63b3761f087c7f39893440dbd) published the examples and refreshed docs. Its contract run [44159020664](https://github.com/shoman2020/oas-polycontract/actions/runs/44159020664) exposed npm 11 in the Node image; security run [44159020804](https://github.com/shoman2020/oas-polycontract/actions/runs/44159020804) flagged a missing non-root user. The next attempt pinned npm 12.2.2 and passed Trivy, but the contract build missed the patch-file copy before `npm ci` ([run 44160039157](https://github.com/shoman2020/oas-polycontract/actions/runs/44160039157)). The following run applied the patch and passed its Node check but Vitest also discovered the Node-only test file, causing a suite-collection failure ([run 44160845635](https://github.com/shoman2020/oas-polycontract/actions/runs/44160845635)). Renaming it resolved the issue; run [44162411257](https://github.com/shoman2020/oas-polycontract/actions/runs/44162411257) passed.
