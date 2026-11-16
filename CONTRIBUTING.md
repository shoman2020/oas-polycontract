# Contributing

This project has one rule, and everything else follows from it:

> **The contract is hand-edited. Nothing downstream is.**

Concretely:

- `openapi/openapi.yaml` (and, for the demo, `demo/openapi.yaml` and
  `demo/downstream/openapi.yaml`) is the only file in this repo you should
  ever edit by hand to change an API's shape. If you find yourself about to
  hand-edit something under `debug/bruno-collection/`, a generated client
  model, or a Swagger UI bundle — stop. Edit the contract and regenerate
  instead.
- Changes to a canonical contract need a review from its `CODEOWNERS` entry
  (see `.github/CODEOWNERS`) before merge.
- A change that `oasdiff breaking` (or, once wired, Specmatic's
  `backward-compatibility-check`) flags as breaking needs either a major
  version bump or a documented deprecation window — not a silent patch.
- Business and integration behavior belongs in the language client suites
  under `clients/`, not duplicated as ad-hoc assertions in Postman/Bruno.
  The contract gate (Specmatic) owns shape and status-code conformance; the
  client suites own behavior the schema can't express.
- `debug/bruno-collection/` is a build artifact. If it drifts from the spec,
  regenerate it (`bru import openapi ...`); don't patch it by hand.

## Versioning `openapi/openapi.yaml`

Decided at Phase 1, per the roadmap, rather than left for later:

- An additive change (new optional field, new endpoint, new enum value on
  a field that's documented as open) → bump `info.version`'s minor
  component only.
- Anything `oasdiff breaking` flags → either a major version bump, or a
  documented deprecation window where the old and new shapes are both
  served for a defined period. Never a silent patch.
- Every change to `openapi/openapi.yaml` updates `info.version` in the
  same commit; `openapi/openapi.base.yaml` only moves forward when a
  release is cut, not on every commit — see `gates/breaking-change/check.sh`.

See `ROADMAP.md` for the full phase-by-phase plan and the current status of
each piece.
