# Contributing

One accountable owner per contract means less maintenance and more trust.

- Edit the canonical contract for its interface: OAS for HTTP APIs and AsyncAPI for event messages.
- Update examples and code-based checks that consume the contract; avoid duplicate specifications.
- Get review from the owners in [CODEOWNERS](.github/CODEOWNERS).
- Bump info.version with contract changes. Additive changes use a minor bump; breaking changes need a major bump or a deprecation period.
- Keep contract validation in the contract gates and behavior assertions in API integration suites.
- Use the [README testing model and glossary](README.md#testing-model-and-terminology) for shared terms; keep implementation steps in focused guides.
- Run `bash ./run.sh` before submitting.

See [ROADMAP.md](ROADMAP.md) for status and remaining work.
