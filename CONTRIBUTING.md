# Contributing

One role owns the contract; everything downstream follows it. Less maintenance, more trust.

- Edit the canonical OpenAPI file for API changes. Keep generated views and clients downstream.
- Get review from the owners in [CODEOWNERS](.github/CODEOWNERS).
- Bump info.version with contract changes. Additive changes use a minor bump; breaking changes need a major bump or a deprecation period.
- Keep schema validation in contract-aware tests and business assertions in native suites.
- Run bash ./run.sh before submitting.

See [ROADMAP.md](ROADMAP.md) for status and remaining work.
