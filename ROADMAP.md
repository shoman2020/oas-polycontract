# Roadmap

One reviewed contract per API boundary. Clear ownership means less maintenance and more trust.

## Status — 17 November 2026

| Area | Delivered | Remaining |
|---|---|---|
| Contracts | OAS for HTTP; AsyncAPI 3.1 examples for WebSocket and Kafka | No event provider or broker |
| Tests | Specmatic provider/consumer, WireMock, stateless fuzzing, stateful workflows, seven native languages, Playwright | Add runtime event examples only with a provider |
| Security | CodeQL, Gitleaks, Trivy, Dependency Review, Dependabot, OWASP SecureAI-Scan; latest checks passed in [run 44146222046](https://github.com/shoman2020/oas-polycontract/actions/runs/44146222046) | SecureAI rules support JS, TS, and Python; no AI runtime is present |
| Dependencies | Cargo, Go, NuGet, npm, Python, and Maven locks; locked builds passed in [contract run 44146222326](https://github.com/shoman2020/oas-polycontract/actions/runs/44146222326) | Replace the temporary Picomatch security pin after a fixed release is published |
| Performance | Per-stage timing and CSV artifacts; manual five-run workflow | Run five samples and record the median and range |
| Showcase | Contract, pipeline, workflow, test-role, and performance views; latest deployment passed in [run 44130117006](https://github.com/shoman2020/oas-polycontract/actions/runs/44130117006) | None for this dependency-only change |

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
- [ ] Migrate Postman or Bruno requests when a source collection is provided.

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
- [x] Verify latest changes from a clean checkout.

### Phase 9 — Reproducible dependencies
- [x] Commit Cargo, Go, and NuGet locks; enforce locked Rust/.NET and read-only Go builds.
- [x] Keep npm, Python, and Maven dependencies pinned or locked.
- [x] Pass a clean CI run with all lock enforcement enabled.

### Phase 10 — Merge policy
- [ ] Require contract and security checks on pull requests.
- [ ] Confirm failed checks block merges and required checks stay stable.

### Phase 11 — Showcase publishing
- [x] Publish the interactive showcase with GitHub Actions; latest verified deployment passed in [run 44130117006](https://github.com/shoman2020/oas-polycontract/actions/runs/44130117006).

### Phase 12 — Performance baseline
- [x] Report per-stage timings in the contract run summary and CSV artifact.
- [x] Add a manual workflow for one cold and four warm pipeline samples.
- [ ] Run it; record medians and ranges before setting thresholds.

### Phase 13 — Optional scaffolder
- [ ] Confirm demand before building `create-polycontract`.
- [ ] If useful, generate selected starters without overwriting hand-edited files.
- [ ] Test in a clean project before publishing.

## Next

1. Run the five-sample performance workflow and record its median and range.
2. Require contract and security checks in branch protection.
3. Add event runtime examples or migrate legacy collections when a provider or collection exists.
4. Revisit the optional CLI when users need selective starters.

## Package fit

This reference repository has no stable runtime API to package. A `create-polycontract` CLI may help if users need selective starters. GitHub templates already seed repositories; npm adds a test and release lifecycle. This is a recommendation based on the current structure: [GitHub templates](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-template-repository) · [npm publishing](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/).

## Progress

- 17 Nov: [Contract run 44146222326](https://github.com/shoman2020/oas-polycontract/actions/runs/44146222326) (#98) passed in 5m 46s with 10/10 repository evaluations and all image scans green. [Security run 44146222046](https://github.com/shoman2020/oas-polycontract/actions/runs/44146222046) (#76) passed, including OWASP GenAI and CodeQL.
- 17 Nov: Updated Go `x/text` to 0.41.0 to resolve Trivy findings and removed the temporary lock-generation workflow. The five-sample performance workflow is still pending.
- 17 Nov: Temporarily pinned the TypeScript test dependency to the fix proposed in upstream Picomatch PR #237 for CVE-2026-112366. The PR is still open; replace the pin with an official release when available.
