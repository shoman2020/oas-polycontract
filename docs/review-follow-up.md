# Review follow-up

This file turns the supplied review into a change checklist. Findings are not treated as verified facts until the relevant check is reproduced against the current branch.

## Priority 1 — Restore confidence in the gates

- [ ] Replace source-text and line-marker repository evaluations with behavioral or structural checks. Keep useful link, file-tree, and shell-path checks; represent pipeline stages as data if they need evaluation.
- [ ] Rename `evals/` to reflect its role as repository consistency checks, or document why the current name is retained.
- [x] Make every documented capability traceable to a running command or workflow. ~~Implement or remove unsupported Swagger UI and Prism claims~~; align Catalog compatibility claims with actual CI coverage.
- [ ] Enforce a contract version bump when a contract changes, then review and re-baseline Product and Order versions where appropriate.
- [ ] Move required CI checks to a supported Ubuntu runner. If Ubuntu 26.04 is still preview, keep it as a non-required canary until it is generally available.
- [ ] Tighten negative canaries to assert specific rule IDs or structured output. Ensure failures cannot pass because of connection errors or unrelated text.
- [x] Separate conformant WireMock mappings from intentional fault fixtures; run contract conformance only against conformant mappings.
- [x] Validate every `versions.env` pin is consumed by the workflow or tooling it claims to configure.

## Priority 2 — Correct behavior and contract semantics

- [ ] Make acceptance scenarios drive behavior. Either use a structured case file as the source of truth, or implement real Gherkin steps that configure scenario data through WireMock's admin API. Remove generated data that can silently diverge from scenarios.
- [ ] Cover `exclusiveMaximum`, nullable schemas without an explicit type, and `$ref` response schemas in Rust and C# validation. Add focused adapter tests or replace the adapters with validators that support the required OAS semantics.
- [x] Fix the Rust client's SKU path encoding and review Product's mapping of upstream 4xx responses.
- [ ] Remove Java validation bypasses and ensure all exercised responses are validated.
- [ ] Resolve the Product/Inventory fixture mismatch: align the `available` example and WireMock behavior, and keep intentionally malformed responses outside the conformant fixture set.
- [ ] Keep AsyncAPI examples explicitly labelled lint-only unless runtime coverage and a maintained broker are added.
- [ ] Preserve the limitation that no consumer-owned expectations are demonstrated. If consumer-driven coverage is a goal, add consumer-owned contracts and a provider verification or bi-directional compatibility flow.

## Priority 3 — Simplify the project and make local use easier

- [ ] Remove source-marker evaluations and split the pipeline stage plan from orchestration logic. Separate image setup, downloads, service lifecycle, execution, and reporting behind small modules.
- [ ] Declare stage prerequisites and manage services through a registry that starts dependencies on demand.
- [ ] Replace no-op Smart Mock readiness and retry-loop-only startup with a real readiness probe.
- [ ] Download shared artifacts once per workflow rather than once per stack.
- [ ] Accept a supported Node.js major version for the host runner and provide a version pin file or tool configuration. Keep exact tool versions pinned inside reproducible containers where needed.
- [ ] Decide whether the Gherkin layer earns its maintenance cost; keep it only if its steps express executable behavior rather than serving as a JSON wrapper.
- [ ] Consider a minimal core with optional language suites and security demonstrations. Keep scanners that protect real project assets as required checks; make unrelated positive-control demonstrations opt-in.
- [ ] Review whether Playwright adds distinct coverage beyond the native API suites and document the reason if retained.

## Priority 4 — Contract layout and lifecycle

- [ ] Reduce duplicated schemas across Product, Inventory, Catalog, and event contracts by extracting shared components where boundaries genuinely share semantics.
- [ ] Rename the Product service or resource to reflect its availability-projection behavior, if that is the intended API boundary.
- [ ] Remove environment-specific test hostnames from reusable contracts; inject server URLs through test configuration.
- [ ] Remove or repurpose the Catalog baseline if it does not represent a running provider. Keep compatibility baselines only for contracts that are actively implemented and checked.
- [ ] Confirm pinned tooling supports OpenAPI 3.1 before migrating from OAS 3.0.3. Upgrade only with validators, mocks, and compatibility tooling verified against the resulting contracts.

## Priority 5 — Hygiene and evidence

- [ ] Normalize tracked text files to the repository's configured line endings and add a check that prevents mixed endings from returning.
- [ ] Correct the attribution in `specmatic.openvex.json` so the named author matches the project maintainer who made the assessment.
- [ ] Refresh the performance matrix after the Testcontainers migration, or remove pre-migration measurements from user-facing documentation.
- [ ] Rename misleading files and tests, including `consumer-contract.test.mjs`, to describe the behavior they actually verify.
- [ ] Document the rationale and fallback plan for `@oaverify` in the JavaScript, TypeScript, and Playwright examples.

## External or conditional work

- [ ] Repository administrator: verify required branch checks are enabled on `main` and confirm they block a test merge.
- [ ] Run the post-migration performance workflow and record cold/warm results.
- [ ] Add a real consumer/provider example only if the project intends to demonstrate consumer-owned expectations.
- [ ] Add auth, pagination, API versioning, RFC 9457 errors, or event runtime tests only when the project adopts those as explicit reference scenarios and can maintain them.

## Completion rule

Close an item only after the implementation is present, the relevant automated check passes, and README/ROADMAP claims match the behavior. Update [ROADMAP.md](../ROADMAP.md) when a follow-up changes a project phase or its status.
