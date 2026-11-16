# oas-polycontract

An executable example and scaffold for code-based API testing around a
shared OpenAPI contract. Each API boundary has one canonical contract;
Specmatic checks contract compatibility, language-specific suites own
business behavior, and WireMock simulates the demo app's downstream
inventory dependency. Swagger UI and generated collections belong in the
manual debugging layer, not as a second automation source.

## Current status

The repository contains a runnable demo pipeline and a separate root Product
Catalog contract with a pinned baseline. The root scaffold also includes
contribution guidance, code ownership, a Spectral ruleset, and a breaking
change script. The root Product Catalog API has no implementation yet, so
root provider tests, language client suites, fuzzing, and the full project
pipeline are still future work. The demo pipeline has been added to local
Compose and GitHub Actions. CI runs the demo on Ubuntu and macOS; see
[`ROADMAP.md`](ROADMAP.md) for phase status and remaining coverage.

## Run the demo pipeline

Requirements: Docker with the Compose v2 plugin. From the repository root:

```bash
bash ./run.sh
```

On Windows, run the script from Git Bash or WSL with `bash ./run.sh`. It
builds the demo app, starts WireMock and the app, verifies the app's
WireMock call, runs both Specmatic suites, and shuts the stack down. Specmatic
HTML reports are written under `demo/build/reports/specmatic/`.

The same command runs in GitHub Actions through
`.github/workflows/contract.yml`. The workflow currently covers the demo
slice on Ubuntu 26.04 and macOS 15 Intel. The macOS job starts Colima to run
the same Docker Compose pipeline.

GitHub Actions also runs CodeQL, secret scanning, dependency and configuration
scans, and PR dependency review. Trivy scans the app container image on
Ubuntu. Dependabot checks GitHub Actions, Docker images, and npm dependencies
weekly.

## Run the services by hand

```bash
docker compose up --build -d wiremock app
curl http://localhost:8080/products/demo-sku
curl http://localhost:8081/__admin/requests
docker compose run --rm wiremock-integration-test
docker compose run --rm specmatic-downstream
docker compose run --rm specmatic-provider
docker compose down
```

The product endpoint should return `sku: "demo-sku"` and `available: 7`.
WireMock's request journal shows the app's call to `/inventory/demo-sku`.

## Project boundaries

- `openapi/openapi.yaml` is the hand-edited root Product Catalog contract;
  `openapi/openapi.base.yaml` is its pinned compatibility baseline.
- `demo/openapi.yaml` is the separate contract for the runnable demo app.
- `demo/downstream/openapi.yaml` describes its inventory dependency, and
  `demo/downstream/wiremock/mappings/` contains the WireMock stub validated
  against that contract.
- `demo/app/server.mjs` is a minimal Node.js reference implementation.
- `demo/app/tests/wiremock.integration.mjs` checks the app response and
  confirms WireMock received the expected downstream request.
- `docker-compose.yml`, `run.sh`, and the GitHub Actions workflow run the
  same demo sequence locally and in CI.
- `CONTRIBUTING.md` describes the contract editing and versioning rules.

See [`ROADMAP.md`](ROADMAP.md) for the full phase plan and
[`CONTRIBUTING.md`](CONTRIBUTING.md) before changing a contract.

## Feedback and bug reports

Have a feature idea or found a bug? [Open an issue](https://github.com/shoman2020/oas-polycontract/issues).
For bugs, include steps to reproduce, the expected and actual results, and
relevant logs or environment details. Contributions are welcome; see
[`CONTRIBUTING.md`](CONTRIBUTING.md).
