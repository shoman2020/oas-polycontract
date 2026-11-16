# Contributing

## One source of truth

> **One role owns the contract; everything downstream follows it. Less maintenance, more trust.**

Hand-edit the contract. Generate or validate everything downstream from it.

- Change an API shape in its canonical OpenAPI file. Do not hand-edit generated clients, Bruno collections, or Swagger UI assets.
- Get the review required by `.github/CODEOWNERS` for contract changes.
- If `oasdiff breaking` flags a change, make a major version change or document a deprecation window.
- Keep business behavior tests in the language-specific client suites. Specmatic owns contract conformance.
- Regenerate debug collections with `bru import openapi` instead of editing them by hand.

## Versioning `openapi/openapi.yaml`

- Additive changes, such as an optional field or endpoint, require a minor version bump.
- Breaking changes require a major version bump or a documented deprecation period.
- Update `info.version` in the same commit as the contract. Move `openapi/openapi.base.yaml` only when cutting a release.

See [`ROADMAP.md`](ROADMAP.md) for project status and remaining work.
