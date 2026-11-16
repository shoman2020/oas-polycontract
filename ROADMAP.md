# oas-polycontract - Project Roadmap

One canonical OpenAPI contract per API boundary. Three code-based test
clients. One set of enforcement gates. Postman/Bruno demoted from "source of
automation" to "generated debugging view." This file is the step-by-step
build plan.

## Guiding rule

Each API boundary has one canonical, hand-edited OAS. Its provider and
consumers use the same contract revision. Specmatic mocks and contract tests,
Swagger UI, and generated collections derive from or validate against that
OAS. A downstream service has its own contract; its WireMock mapping is
validated against that contract. Nothing downstream becomes an independent
source of truth.

## Current status (16 November 2026)

| Area | Status | What exists and what remains |
|---|---|---|
| Demo | Implemented; Ubuntu CI | Product API, two OpenAPI contracts, WireMock mapping, Specmatic checks, and an integration test are in `demo/`. |
| Specmatic | Demo provider and downstream checks pass on Ubuntu | Consumer Smart Mock tests and example validation remain. The provider's 404 and 502 scenarios are skipped because they lack examples. |
| CI pipeline | Ubuntu CI; macOS local support | GitHub Actions runs on Ubuntu. `run.sh` supports macOS local use with Docker Desktop or Colima. |
| Security | Core scans pass; image scan remediation is in progress | CodeQL, Gitleaks, the filesystem scan, and app image scan passed. Trivy flagged base OS packages and unused Pebble in WireMock; Specmatic image scan is pending. |
| Root scaffold | Contract and governance files exist; runtime work remains | The Product Catalog contract and baseline, Spectral ruleset, and breaking-change script are present. There is no root API implementation. The root gates, client suites, fuzzing, and debug layer remain future work. |
| MCP integration | Considered; not implemented | Proposed options and boundaries are recorded below. MCP will remain optional and outside CI's source of truth. |
| Legacy migration | Conditional | No legacy collection was supplied. Phase 5 applies only if the root API later follows Path A. |
| Boilerplate CLI | Not started | Phase 9 remains future work until the reusable pipeline is stable. |

### Recent progress

| Date | Progress | Result |
|---|---|---|
| 16 Nov 2026 | Ran the demo pipeline on Ubuntu 26.04.1 and upgraded checkout to Node 24. | Passed in [GitHub Actions](https://github.com/shoman2020/oas-polycontract/actions/runs/43870308370); the Node 20 and `ubuntu-latest` warnings are gone. |
| 16 Nov 2026 | Added an Ubuntu/macOS runner matrix and Colima setup. Made `run.sh` accept both Compose CLI forms. | Ubuntu and macOS passed in the initial matrix. macOS was later removed from CI per project scope; local support remains. |
| 16 Nov 2026 | Consolidated README and documented contract formats plus native test stacks for Rust, Go, Python, JavaScript, TypeScript, Java, and C#. | Migration guidance is documented; language suites still need implementation. |
| 16 Nov 2026 | Added CodeQL, Gitleaks, Trivy, Dependency Review, and weekly Dependabot checks. | CodeQL, Gitleaks, the filesystem scan, and app image scan passed. WireMock's image includes vulnerable OS packages and an unused Pebble binary; the demo now builds a patched, reduced image. |
| 16 Nov 2026 | Dependabot merged [Specmatic 2.56.1](https://github.com/shoman2020/oas-polycontract/commit/2c02b375dd12c79800426ff7adabb3bafef9316d) and [Node 26](https://github.com/shoman2020/oas-polycontract/commit/fe29b278e8c8d47d6627b33a829d06d446198887). | The demo and image scan use the updated versions. |
| 16 Nov 2026 | Recorded MCP options and added a README issue-reporting link. | Design only; no MCP server or client added. |

The checklist below tracks implementation. This table records what CI has
verified and what still needs a run.

### Review history

- The initial review found startup races. Health checks and
  `service_healthy` dependencies now gate the demo services.
- The demo app, two API contracts, WireMock stub, Specmatic checks, and
  integration test are in place. Ubuntu CI passed; cross-platform status is
  tracked above.
- The root Product Catalog contract and pinned baseline were designed for
  this scaffold. Lint and compatibility scripts exist, but the root API has
  no implementation, so its runtime suites remain future work.
## Target repository layout

```
oas-polycontract/
+-- openapi/
|   +-- openapi.yaml            # the contract - hand-edited, nothing else is
|   \-- openapi.base.yaml       # last-released version, used by the breaking-change gate
+-- legacy/                     # one-time import of existing Postman/Bruno collections
+-- debug/
|   +-- bruno-collection/       # generated FROM openapi.yaml - never hand-edited
|   \-- swagger-ui/             # docker-compose for hosted, per-env Swagger UI
+-- clients/
|   +-- java/                   # REST Assured + swagger-request-validator
|   |   \-- src/test/resources/wiremock-mappings/  # stubs for the app's OWN dependencies, see WireMock
|   +-- python/                 # Pytest + Requests + Schemathesis
|   \-- js/                     # Playwright/Supertest + jest-openapi
+-- gates/
|   +-- lint/                   # Spectral ruleset
|   +-- breaking-change/        # oasdiff config
|   \-- contract/                # Specmatic - see the dedicated section below
+-- demo/                        # runnable Specmatic + WireMock example - see the integration demo section below
|   +-- openapi.yaml
|   +-- specmatic.yaml          # example and schema-resiliency test settings
|   +-- openapi_examples/        # shared request/response examples for provider tests and consumer mocks
|   +-- consumer/                # code-based consumer tests against a Specmatic Smart Mock
|   +-- app/                     # minimal reference implementation
|   \-- downstream/               # a second tiny spec + WireMock mapping for the app's one dependency
+-- docker-compose.yml
+-- run.sh                      # one command, runs every gate locally
+-- bin/
|   \-- create-polycontract.js  # scaffolding CLI - see Phase 9
+-- templates/                  # per-option file/fragment sources the CLI stamps out
\-- .github/workflows/contract.yml
```

---

## Phase 0 - Scaffold the repo

- [x] Create the directory layout above (empty folders with `.gitkeep` is fine for now).
- [x] Add a root `README.md` with the demo pitch and a quick start.
- [x] Extend the README with the full project pitch: one OAS, Java/Python/JS clients, and governance gates in CI.
- [x] Add `.editorconfig` and a `CODEOWNERS` entry for `openapi/openapi.yaml` - this is the file every other phase depends on, so changes to it should require review.

## Phase 1 - Establish the single source of truth

Three different starting points land here. Pick the one that matches
reality - don't default to Path A just because the rest of this document
talks about migration.

**Path A - no OAS yet, legacy Postman/Bruno collections exist.**
Go do Phase 5 first, then come back here to baseline the result.

**Path B - an OAS already exists, hand-authored (design-first).**
There's nothing to migrate. Skip Phase 5 entirely.

- [x] Add a hand-authored root contract at `openapi/openapi.yaml`. *(16 Nov 2026: no root OAS existed, so the Product Catalog API was designed fresh; it was not imported from an existing file.)*
- [x] Copy it to `openapi/openapi.base.yaml` - the "last known good" baseline the breaking-change gate diffs against.
- [x] Go straight to Phase 2.

**Path C - an OAS already exists, generated from the code** (FastAPI's
`/openapi.json`, springdoc-openapi, drf-spectacular, tsoa, NestJS's Swagger
module, etc.). Also skip Phase 5 - but this path has a structural wrinkle
the other two don't, worth sitting with before moving on:

The spec here isn't actually a separate hand-edited artifact - it's a live
mirror of whatever the code's annotations currently say. That inverts this
project's guiding rule: the annotated code, not the YAML, is still the real
source of truth; the YAML is just its byproduct. Three consequences follow:

1. **The fuzz/drift gate loses most of its value.** Schemathesis compares
   the implementation's responses against the spec - but the spec was
   generated *from* that same implementation, so a logic bug ships
   "compliant" with its own mirror. It still catches malformed responses
   and unhandled exceptions; it can't catch "this endpoint is wrong on
   purpose, consistently."
2. **There's no natural moment to pin a baseline to.** A hand-authored spec
   gets a baseline at "whenever someone last edited it." A generated one
   regenerates on every build, so you have to *explicitly* freeze one:
   export it once, commit it as `openapi/openapi.base.yaml`, and treat every
   later regeneration as a candidate revision to diff against that frozen
   copy - not as the automatic new truth.
3. **The breaking-change gate stops being a backup and becomes the main
   safety net.** The classic failure mode this whole project defends
   against - "someone changed the code and forgot to update the spec" -
   literally cannot happen here, because the spec always keeps up
   automatically. What replaces it is worse: a developer changes a response
   model for an unrelated reason, the spec silently changes with it, and
   nothing stops that from reaching consumers unless `oasdiff breaking`
   is wired to run against a freshly-regenerated spec on every build, not
   a stale committed one.

- [ ] If you're on this path, add a CI step that regenerates the spec from
      the running code *before* any other gate runs, so `oasdiff breaking`
      is always diffing today's baseline against what the code actually
      emits right now.
- [ ] Note this in `README.md` explicitly - anyone adding a test later
      should know the fuzz gate here is weaker than on a design-first spec.

**Whichever path got you here:** decide your versioning rule now, not
later - additive change to version bump only; anything that fails
`oasdiff breaking` to requires a major version bump or a documented
deprecation window.

**Current status (16 Nov 2026):** the two demo contracts are design-first and
live under `demo/`, unchanged. The repository-level decision has now been
made: no root API existed, so Path B was followed by designing
`openapi/openapi.yaml` fresh - a Product Catalog API that is a distinct
contract from the demo's Product API, not a promotion of it (per this
file's own earlier caution above). `openapi/openapi.base.yaml` is a pinned
copy of the same file as of this commit. See the review note below for
what this does and doesn't unblock.

## Phase 2 - Governance gates (make the spec trustworthy before testing against it)

- [x] **Lint** - add a Spectral ruleset under `gates/lint/.spectral.yaml` (start with `extends: ["spectral:oas"]`, then layer your own house rules). Added; not yet run in CI or against a live `npx spectral` install (no network in this environment - see the review note below).
- [x] **Breaking-change check** - add `oasdiff breaking openapi/openapi.base.yaml openapi/openapi.yaml` as a required check. Added as `gates/breaking-change/check.sh`; not yet wired into `run.sh`/CI, and not run - no `oasdiff` binary or network to fetch it in this sandbox.
- [ ] **Drift / fuzz check** - add a Schemathesis run against a live or staged instance of the API; this is the step that actually proves the implementation still matches the spec, not just that the spec is well-formed.
- [x] **Demo contract checks** - Specmatic checks the demo provider and WireMock inventory stub against their OpenAPI contracts. The Ubuntu Actions run passed. The provider's 404 and 502 scenarios remain skipped until examples are added.
- [ ] **Root contract gate** - decide whether Specmatic is the required root provider gate, and add it after the root contract and app exist.
- [ ] **Behavioral backward-compatibility check (optional)** - `specmatic backward-compatibility-check` is a slower, more thorough alternative to `oasdiff breaking`: it stubs the new spec and replays tests generated from the old one, so it catches some things (e.g. discriminator/subtype changes) a structural diff won't.
- [ ] Wire whichever of these are in use as required CI checks before touching the language-specific clients - there's no point writing test suites against a contract nothing is enforcing yet.

Don't run every gate at full strength by default - Specmatic's contract
check overlaps with the per-language schema validators in Phase 3, and its
backward-compatibility check overlaps with `oasdiff`. Pick one layer to own
each concern rather than running all of them at once out of caution. See the
integration demo section below for the current executable Specmatic example.

## Phase 3 - Code-based test clients (the "drop language-agnostic automation" step)

Code-based client suites own business and integration behavior. The contract
gate checks provider conformance against `openapi/openapi.yaml`; client suites
should focus on behavior that the schema cannot express instead of duplicating
the same status and shape assertions in every language.

- [ ] Add starter suites for Rust (`cargo test`/`reqwest`), Go (`testing`/`net/http`/`kin-openapi`), Python (`pytest`/Schemathesis), JavaScript (`node:test` or Jest), TypeScript (Vitest/Jest), Java (JUnit/REST Assured), and C# (xUnit/`HttpClient`). Validate wire responses against the canonical OAS at runtime; generated types alone are compile-time checks.
- [ ] Provide migration steps from Postman/Bruno requests and assertions into each native suite. Keep business assertions in code and remove duplicate status/schema assertions once OAS validation covers them.
- [ ] Every suite consumes `openapi/openapi.yaml` directly or generated artifacts reproducibly from it - never a hand-maintained schema copy.
- [ ] Add a small code-based consumer example that tests its behavior against a Specmatic Smart Mock built from the same OAS.

## Contract format and protocol scope

- [x] Document that OpenAPI covers HTTP interfaces and JSON/XML media types.
- [x] Route WebSocket and event protocols such as Kafka, MQTT, and AMQP to AsyncAPI; route gRPC to Protobuf service definitions and GraphQL to SDL.
- [ ] Add representative AsyncAPI (WebSocket/Kafka) and gRPC/GraphQL examples with validation gates when the project adds those interface types.

## Phase 4 - Debugging layer (Swagger UI + mock server, generated and disposable)

- [ ] Host Swagger UI from `openapi/openapi.yaml`, parameterized per environment (dev/staging/prod base URL) - see the Docker section below.
- [ ] Run a Prism mock server off the same file so frontend/exploratory testers can work against the contract before the real service exists.
- [ ] Use Specmatic Smart Mock for consumer tests; keep Prism for exploratory/manual work so mock behavior does not become a separate CI contract source.
- [ ] Regenerate the Bruno debugging collection from the spec on every change (`bru import openapi`) instead of maintaining it by hand - this is what actually stops the duplication the article complains about. On Path B/C (Phase 1) there's no prior collection to replace, so this step is optional rather than a migration - only add it if manual debuggers actually want a Bruno collection instead of just Swagger UI.

## Phase 5 - Migrate existing Postman/Bruno collections

**Current status:** no legacy collection was supplied, so this phase is not
applicable unless the root project later follows Path A.

Only relevant on Path A from Phase 1. If the OAS already existed (Path B
or C), there's no legacy collection to convert and nothing here applies -
skip straight to Phase 6.

This is a one-time import, not an ongoing workflow - see the dedicated
section below for commands. The output of this phase is a first draft of
`openapi/openapi.yaml`; it still needs a human pass for missing schemas,
security definitions, and descriptions before it's trustworthy enough to
gate on.

## Phase 6 - Containerize everything

- [x] Add a focused `docker-compose.yml` and `run.sh` for the demo app, WireMock dependency, integration check, and Specmatic checks. Add healthchecks so dependent services wait until ready.
- [x] Build the WireMock demo image from the official image, update OS packages, remove its unused Pebble binary, and run it as non-root.
- [x] Support macOS locally via Docker Desktop or Colima and both Compose CLI forms in `run.sh`.
- [x] Run GitHub Actions on Ubuntu only; macOS is not a CI runner.
- [ ] Expand Compose to wire the root app, all three client suites, governance gates, and selected debug services.
- [ ] Extend `run.sh` to run the complete suite in sequence and tear down even when a gate fails - see the Docker section below.

## Phase 7 - CI

- [x] The demo `.github/workflows/contract.yml` invokes `bash ./run.sh` on Ubuntu. macOS remains supported for local runs.
- [x] Add CodeQL, Gitleaks, Trivy, and Dependency Review checks. Pin actions to commit SHAs and configure weekly Dependabot updates. CodeQL, Gitleaks, filesystem, and app image scans passed; WireMock and Specmatic image scans are in progress.
- [ ] Extend the workflow to the complete Compose suite and require lint, compatibility, client, and fuzz checks on the default branch.

## Phase 8 - Docs

- [x] Root `README.md` documents the demo flow and `bash ./run.sh` quick start.
- [x] `README.md` invites feature requests and bug reports through GitHub Issues.
- [ ] Complete the full-project README with the OAS to gates to clients to debug-layer diagram and full suite quick start.
- [x] `CONTRIBUTING.md`: one role owns the contract; downstream work follows from it.

## Phase 9 - Boilerplate CLI (so another team can reuse this without copy-pasting)

Everything above produces one working instance of this setup for one API.
This phase turns it into something a *different* team can stand up for
*their* API in minutes, by answering a handful of options instead of
hand-pruning the reference repo.

- [ ] Build `bin/create-polycontract.js` - flags for a non-interactive run, prompts as the fallback when a flag is omitted (see the dedicated section below for the full options list).
- [ ] Split `init` (first scaffold) from `add` (bring in one more client or gate later) - a team that started Python-only shouldn't have to re-run the whole wizard to add the Java client six months in.
- [ ] Keep every generated piece optional and independently addable: no client, gate, or layer the CLI can produce should be hard-wired into another one.

## Optional MCP integrations

**Status:** considered; no MCP component is implemented.

The first useful integration is GitHub's [official MCP Server](https://github.com/github/github-mcp-server) in a compatible developer agent. It can provide repository, pull request, and Actions context while contributors work on this project. Keep its permissions scoped to the user's needs; do not add it as a pipeline dependency.

If project-specific MCP tools prove useful, add a small local server using the [official TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk). It may expose the canonical OAS files as resources and provide allow-listed tools that call existing scripts, such as lint, compatibility checks, and `run.sh`.

Keep MCP optional. Do not add a second contract store, arbitrary shell execution, or a CI path that bypasses the checked-in scripts. Start with local stdio transport. Build this only after the core gates are stable.

---

## Migrating from Postman and Bruno to code

Applies to Path A from Phase 1 only. If the OAS already existed when this
project started (Path B or C), skip this whole section - there's no
legacy collection to convert, and no legacy test scripts to port in the
subsection below either.

The goal isn't a one-off file conversion - it's flipping which artifact is
authoritative. Collections stop being hand-maintained and become a generated
view of the spec.

### From Postman

```bash
npm i -g @readme/postman-to-openapi   # actively maintained fork; CLI-less - use as a library, or
npm i -g postman-to-openapi           # the original, ships a CLI

postman-to-openapi ./legacy/collection.json -o ./openapi/openapi.yaml
```

This gets you paths, methods, and example-based request/response shapes -
not full schemas. Treat the output as a draft: run it through the Phase 2
lint gate immediately, and expect to hand-add `required` fields, proper
`type`/`format` constraints, and security schemes that Postman examples
don't carry.

### From Bruno

Bruno's desktop app can export a collection straight to OpenAPI (`...` menu
to **Share** to **OpenAPI Specification**) - but that export is gated behind
Bruno's paid Golden/Ultimate tiers. If you're on the free tier, go through
Postman's format instead:

```bash
# .bru files to Postman Collection v2.1 (free, open-source, Go CLI)
go install github.com/jonathanhecl/bru-ship@latest
bru-ship -input ./legacy/bruno-collection -output ./legacy/bruno-export.json

# Postman Collection to OpenAPI draft
postman-to-openapi ./legacy/bruno-export.json -o ./openapi/openapi.yaml
```

Same caveat as above: lint it, then fill in the schema detail by hand.

### After migration: reverse the direction

Once `openapi/openapi.yaml` is the accepted source of truth, stop exporting
*from* Bruno/Postman entirely. Generate the debugging collection *from* the
spec instead, on every change:

```bash
bru import openapi \
  --source openapi/openapi.yaml \
  --output debug/bruno-collection \
  --collection-name "oas-polycontract (debug)"
```

Commit `debug/bruno-collection/` as a build artifact, not as something
anyone edits directly - if it drifts from the spec, regenerate it, don't
patch it.

### Porting existing test scripts (not just request shapes)

`postman-to-openapi` and the Bruno export only capture *shape* - paths,
methods, example bodies. They silently drop every `pm.test()` block in
Postman and every `tests {}` / `assert {}` block in Bruno. That script
content is where the team's actual regression coverage lives, and it has to
be ported by hand - it won't come along for free with the spec conversion.

**Step 1 - extract every test script into one inventory file**, so nothing
gets lost silently during the migration.

```js
// extract-postman-tests.js - walks a Postman collection.json and dumps
// every pm.test() block, keeping its full request path for context
const fs = require('fs');
const collection = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

function walk(items, path = []) {
  for (const item of items) {
    if (item.item) { walk(item.item, [...path, item.name]); continue; }
    const testEvent = (item.event || []).find(e => e.listen === 'test');
    if (testEvent) {
      console.log(`## ${[...path, item.name].join(' > ')}`);
      console.log(testEvent.script.exec.join('\n'), '\n');
    }
  }
}
walk(collection.item);
```

```bash
# Bruno: dump every tests{} / assert{} block, one request per section
# (good enough for a first-pass inventory - nested braces inside a block
# will need a manual look, this isn't a full .bru parser)
for f in $(find ./legacy/bruno-collection -name '*.bru'); do
  echo "## $f"
  awk '/^(tests|assert) \{/,/^\}/' "$f"
  echo
done > legacy/test-inventory.md
```

**Step 2 - triage each assertion into one of three buckets.** Don't port
everything 1:1; most legacy assertions fall into the first bucket and
should be *retired*, not translated.

| Bucket | Example from the legacy script | What happens to it |
|---|---|---|
| **Redundant** | `pm.response.to.have.status(200)`, `expect(body).to.have.property('id')` | Dropped - the Phase 3 schema validator already fails the test on any status or shape mismatch. Porting these would just duplicate the contract gate in test code. |
| **Belongs in the spec, not the test** | `expect(body.id).to.be.above(0)` | Tighten `openapi.yaml` instead (`type: integer, minimum: 1`) and let the schema validator enforce it for every client at once, rather than hand-coding the same numeric check three times. |
| **Genuine business rule** | `expect(body.welcomeEmailSent).to.equal(true)` | Can't be expressed as a structural schema constraint - port this one, and only this one, into the code client. |

Everything that captures state for a later request (`pm.environment.set(...)`,
`bru.setEnvVar(...)`) isn't a test at all - it's chaining, and becomes a
plain helper function or fixture in the target client, not an assertion.

**Step 3 - port only the survivors.** One assertion, across the original
script and the three targets:

```js
// Bruno/Postman source (create-user.bru) - three assertions, one survives triage
tests {
  test("status is 201", function() { expect(res.status).to.equal(201); });          // redundant
  test("id is numeric and positive", function() {                                     // to tighten the OAS schema instead
    expect(res.body.id).to.be.a('number');
    expect(res.body.id).to.be.above(0);
  });
  test("welcome email flag defaults true", function() {                               // to the one to port
    expect(res.body.welcomeEmailSent).to.equal(true);
  });
}
```

```python
# clients/python - pytest
def test_create_user_defaults_welcome_email(api_client):
    token = api_client.login(TEST_USER, TEST_PASS)           # was: bru.setEnvVar("token", ...)
    response = api_client.post("/users", json={"name": "Ada"}, token=token)
    # status + id shape/minimum are enforced by the schema validator - not re-asserted here
    assert response.json()["welcomeEmailSent"] is True
```

```java
// clients/java - REST Assured
@Test
void createUser_defaultsWelcomeEmailToTrue() {
    String token = login(TEST_USER, TEST_PASS);              // was: bru.setEnvVar("token", ...)
    given()
        .header("Authorization", "Bearer " + token)
        .filter(new OpenApiValidationFilter("openapi.yaml")) // replaces the status/shape asserts
        .body(Map.of("name", "Ada"))
    .when()
        .post("/users")
    .then()
        .body("welcomeEmailSent", equalTo(true));
}
```

```js
// clients/js - Playwright/Supertest
test('create user defaults welcome email to true', async () => {
  const token = await login(TEST_USER, TEST_PASS);           // was: bru.setEnvVar("token", ...)
  const res = await request(app)
    .post('/users')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Ada' });
  expect(res).toSatisfyApiSpec();                             // replaces the status/shape asserts
  expect(res.body.welcomeEmailSent).toBe(true);
});
```

Note what disappeared at each step: the status check is gone (Phase 3
covers it generically), the numeric/positive check moved into
`openapi.yaml` itself, and only the one assertion with no structural home -
the business rule - made it into actual test code.

---

## Integration demo - Specmatic and WireMock

**Status:** `bash ./run.sh` passed on Ubuntu 26.04.1 and macOS Intel. GitHub Actions now runs this demo on Ubuntu; macOS stays supported for local runs.

The `demo/` directory is a runnable example of the contract-testing flow.
It contains a small product API, an OpenAPI contract for that API, and a
second contract for the inventory dependency. The product API calls the
inventory service, which WireMock serves from a checked-in mapping.

The pipeline demonstrates three separate checks:

1. `wiremock-integration-test` calls the product API and confirms WireMock
   recorded the expected inventory request.
2. `specmatic-downstream` runs the downstream OpenAPI contract against
   WireMock, validating the stub's response.
3. `specmatic-provider` runs the product API's OpenAPI contract against the
   running demo app.

Run all three with `bash ./run.sh`. The GitHub Actions workflow calls the same
script, so local and CI runs use the same command. Specmatic reports are
written under `demo/build/reports/specmatic/` and are generated artifacts.

The Ubuntu run passed the downstream scenario and both provider scenarios
with examples. Specmatic skipped the provider's 404 and 502 scenarios because
they do not yet have examples.

The demo is intentionally a focused example. The Java, Python, and JS clients,
lint and breaking-change gates, and the broader debug layer in the target
layout remain separate roadmap work. It currently demonstrates provider and
downstream contract checks; it does not yet include a consumer Smart Mock or
consumer code tests.

---

## Docker

One compose file, one entrypoint script. Everything in this section is
disposable - nothing here is a source of truth, so containers can be
rebuilt from scratch at any time.

```yaml
# docker-compose.yml
services:
  app:
    build: ./app              # the service under test

  lint:
    image: stoplight/spectral:latest
    volumes: ["./openapi:/spec", "./gates/lint:/rules"]
    command: lint --ruleset /rules/.spectral.yaml /spec/openapi.yaml

  breaking-change:
    image: tufin/oasdiff:latest
    volumes: ["./openapi:/spec"]
    command: breaking /spec/openapi.base.yaml /spec/openapi.yaml

  fuzz:
    build: ./clients/python
    depends_on: [app]
    volumes: ["./openapi:/spec"]
    command: st run /spec/openapi.yaml --url http://app:8080

  java-tests:
    build: ./clients/java
    depends_on: [app]
    command: mvn -q test

  js-tests:
    build: ./clients/js
    depends_on: [app]
    command: npx playwright test

  mock:
    image: stoplight/prism:5
    ports: ["4010:4010"]
    volumes: ["./openapi:/spec"]
    command: mock -h 0.0.0.0 /spec/openapi.yaml

  swagger-ui:
    image: swaggerapi/swagger-ui
    ports: ["8081:8080"]
    environment:
      SWAGGER_JSON: /spec/openapi.yaml
    volumes: ["./openapi:/spec"]
```

```bash
#!/usr/bin/env bash
# run.sh - one command, runs every gate and client, then tears down
set -euo pipefail

docker compose build
docker compose up -d app mock swagger-ui

docker compose run --rm lint
docker compose run --rm breaking-change
docker compose run --rm java-tests
docker compose run --rm js-tests
docker compose run --rm fuzz

docker compose down
```

`./run.sh` is what both a developer's laptop and `.github/workflows/contract.yml`
call - there is exactly one definition of "the suite passes."

---

## Boilerplate CLI

A team that already has a Postman collection and wants *one* code client,
not three, shouldn't have to delete two-thirds of this repo by hand. The
CLI's job is to generate only the pieces that were asked for.

No new runtime dependency: Node is already required for Playwright,
Spectral, Prism, and the Bruno CLI, so the scaffolder is a Node script too -
`commander` for flags, `@inquirer/prompts` for the interactive fallback when
a flag is left out, `js-yaml` for merging the chosen docker-compose
fragments into one file (safer than splicing YAML as text).

### Options reference

| Flag | Values | Effect |
|---|---|---|
| `--name` | string | Project name, stamped into `README.md` and `package.json`. |
| `--spec` | path or URL | Seeds `openapi/openapi.yaml` directly - Phase 1 Path B or C, no Phase 5 migration run. |
| `--spec-origin` | `design-first` \| `code-first` | Only meaningful with `--spec`. `code-first` adds the "regenerate-then-diff" CI step and the fuzz-gate caveat to the generated `README.md` automatically (Phase 1 Path C); `design-first` skips both (Path B). |
| `--from-postman` | path | Runs the Phase 5 Postman conversion inline instead of `--spec` - Path A. |
| `--from-bruno` | path | Runs the Phase 5 Bruno conversion (via `bru-ship`) inline instead of `--spec` - Path A. |
| `--clients` | comma list: `java`, `python`, `js` | Generates only the chosen `clients/<lang>` folders, their Dockerfiles, and their docker-compose services. |
| `--gates` | comma list: `lint`, `breaking`, `fuzz` | Generates only the chosen `gates/` configs and compose services - e.g. a team with no prior release yet can skip `breaking` until `openapi.base.yaml` exists. |
| `--debug-layer` / `--no-debug-layer` | flag | Whether to generate Prism + Swagger UI + the Bruno debug-collection regeneration step. |
| `--docker` / `--no-docker` | flag | Whether to generate `docker-compose.yml` and `run.sh` at all, for teams that will wire the pieces into their own existing CI instead. |
| `--ci` | `github` \| `none` | Whether to generate `.github/workflows/contract.yml`. |

Running `create-polycontract` with no flags drops into interactive prompts
for each of the above. Running it with every flag set (e.g. from another
team's own onboarding script) scaffolds with zero prompts - useful for
`npx create-polycontract --name billing-api --spec ./billing.yaml --clients python,js --gates lint,breaking --no-debug-layer --ci github`.

### `init` vs `add`

```bash
# first scaffold
npx create-polycontract init --name billing-api --spec ./billing.yaml --clients python

# six months later: bring in the Java client without touching anything already generated
npx create-polycontract add client java

# turn on the fuzz gate once there's a staging environment to point it at
npx create-polycontract add gate fuzz
```

`add` only ever creates what's missing - it diffs the requested piece
against what's already in the repo and refuses to overwrite a file that
was hand-edited after generation (tracked via a checksum written into
`.polycontract-manifest.json` at generation time).

### How a flag becomes files

```js
// bin/create-polycontract.js - abbreviated
import { Command } from 'commander';
import { select, checkbox, input } from '@inquirer/prompts';
import yaml from 'js-yaml';
import fs from 'node:fs';
import path from 'node:path';

const program = new Command();
program
  .command('init')
  .option('--name <name>')
  .option('--spec <path>')
  .option('--clients <list>')
  .option('--gates <list>')
  .option('--no-debug-layer')
  .option('--ci <provider>', 'github or none', 'github')
  .action(async (opts) => {
    const name    = opts.name    ?? await input({ message: 'Project name:' });
    const clients = opts.clients?.split(',') ?? await checkbox({
      message: 'Which test clients?',
      choices: ['java', 'python', 'js'].map(value => ({ value })),
    });
    const gates   = opts.gates?.split(',') ?? await checkbox({
      message: 'Which governance gates?',
      choices: ['lint', 'breaking', 'fuzz'].map(value => ({ value })),
    });

    for (const lang of clients) copyTemplate(`clients/${lang}`, `clients/${lang}`, { name });
    for (const gate of gates)   copyTemplate(`gates/${gate}`, `gates/${gate}`, { name });

    writeCompose({ clients, gates, debugLayer: opts.debugLayer });
    if (opts.ci === 'github') copyTemplate('ci/github', '.github/workflows', { name });

    fs.writeFileSync('.polycontract-manifest.json', JSON.stringify({ clients, gates }, null, 2));
  });

function writeCompose({ clients, gates, debugLayer }) {
  const services = {
    app: yaml.load(fs.readFileSync('templates/compose/app.yml', 'utf8')),
    ...Object.fromEntries(clients.map(c => [`${c}-tests`, yaml.load(fs.readFileSync(`templates/compose/${c}.yml`, 'utf8'))])),
    ...Object.fromEntries(gates.map(g   => [g,            yaml.load(fs.readFileSync(`templates/compose/${g}.yml`, 'utf8'))])),
    ...(debugLayer ? yaml.load(fs.readFileSync('templates/compose/debug-layer.yml', 'utf8')) : {}),
  };
  fs.writeFileSync('docker-compose.yml', yaml.dump({ services }));
}
```

Each `templates/compose/<piece>.yml` is exactly one service definition - the
same fragments shown in the Docker section above, just stored individually
so the generator can include or skip each one independently, rather than
the CLI needing its own copy of that YAML.

---

## Definition of done (per phase)

- **Phase 1 passes** when exactly one of the three paths was followed end
  to end - never a mix - and, on Path C specifically, `oasdiff breaking`
  runs against a freshly-regenerated spec in CI, not a committed snapshot
  that can go stale.
- **Phase 2 passes** when a deliberately broken `openapi.yaml` (bad YAML, a
  removed required field) fails CI before any test client runs.
- **Phase 3 passes** when a service change that alters a response shape -
  without touching the spec - fails a contract check, and client suites cover
  business behavior that the contract cannot express.
- **Phase 4 passes** when `debug/bruno-collection/` is produced only by
  `bru import openapi`, never committed by hand.
- **Phase 5 test-porting passes** when the inventory file accounts for
  every legacy assertion as exactly one of: retired as redundant, folded
  into a tightened OAS constraint, or ported into a single code client -
  with no assertion left duplicated across more than one of those three.
- **Phase 6 passes** when `./run.sh` on a clean checkout, with nothing but
  Docker installed, reproduces the same pass/fail as the last CI run.
- **Phase 9 passes** when `create-polycontract init` with every option
  flagged produces a repo that `./run.sh` passes with zero manual edits,
  and `create-polycontract add <piece>` never overwrites a file that was
  hand-edited since it was generated.

---

## Recommendations and next steps

1. **Add the consumer side to the demo.** Write a small code-based consumer
   suite and run it against a Specmatic Smart Mock generated from the same
   `demo/openapi.yaml`. Keep business assertions in that code; let Specmatic
   validate the HTTP interaction against the OAS. Add success, error, and
   partial examples shared by the consumer mock and provider contract tests.
2. **Make examples and boundary behavior explicit.** Validate externalized
   examples in CI. Add provider checks for invalid inputs and deterministic
   setup for stateful scenarios. Use Specmatic's current v3
   `schemaResiliencyTests` configuration for generated boundary tests; the
   `SPECMATIC_GENERATIVE_TESTS` environment variable is deprecated.
3. **Add a contract evolution gate.** For the current single-repository demo,
   compare the proposed OAS with the default branch using
   `specmatic backward-compatibility-check` and require it on pull requests.
   If multiple repositories begin consuming the contract, move the OAS to a
   versioned central contract repository and have consumers/providers refer
   to the same released revision. For incompatible changes, publish a new
   contract version and overlap support during consumer migration.
4. **Keep each tool in its lane.** Use language-specific code suites for
   regression and business behavior, Specmatic for provider/consumer contract
   checks and Smart Mocks, and WireMock for the demo app's own downstream
   inventory dependency. Keep Swagger UI and any generated collections in the
   manual debugging layer; don't make them a second CI automation source.
5. **Finish the full project in dependency order.** The root OAS path,
   baseline, and initial governance files are now in place. Next, decide
   whether the root contract gets a minimal reference implementation or
   remains contract-only, then add the appropriate provider and consumer
   checks. Wire the breaking-change gate into CI, add language client suites,
   and expand Compose/CI with fuzzing and the debugging layer. Build the CLI
   only after the end-to-end scaffold is stable.
6. **Keep security checks current.** Review CodeQL, Gitleaks, Trivy, and
   Dependency Review results on every change. Let Dependabot propose updates
   for Actions, container images, and npm packages.
7. **Revisit MCP after CI gates stabilize.** Start with the GitHub MCP Server
   for developer workflow context. Add project-owned tools only when they
   wrap existing scripts without changing the contract or CI path.
