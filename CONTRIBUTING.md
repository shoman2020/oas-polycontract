# Contributing

One accountable owner per contract means less maintenance and more trust.

- Edit the canonical contract for its interface: OAS for HTTP APIs and AsyncAPI for event messages.
- Update examples and code-based checks that consume the contract; avoid duplicate specifications.
- Get review from the owners in [CODEOWNERS](.github/CODEOWNERS).
- Bump info.version with contract changes. Additive changes use a minor bump; breaking changes need a major bump or a deprecation period.
- Keep specification validation in contract gates, API behavior checks in unit and integration tests, and acceptance criteria in Gherkin.
- For a behavior change, update the relevant `.feature` scenario, write the failing test first, implement the smallest change, then rerun the focused test and full pipeline.
- Keep Gherkin scenarios focused on user-visible outcomes; keep HTTP mechanics in Cucumber steps and service behavior checks in isolated unit tests.
- Use the [README testing model and glossary](README.md#testing-model-and-terminology) for shared terms; keep implementation steps in focused guides.
- Run `bash ./run.sh` before submitting.

See [ROADMAP.md](ROADMAP.md) for status and remaining work.
