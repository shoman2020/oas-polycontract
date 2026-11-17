#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

set -a
source .github/versions.env
set +a

if docker compose version >/dev/null 2>&1; then
  compose=(docker compose -f docker-compose.yml)
elif command -v docker-compose >/dev/null 2>&1; then
  # Homebrew installs Compose as a standalone CLI and plugin directory.
  compose=(docker-compose -f docker-compose.yml)
else
  echo "Docker Compose is required (docker compose or docker-compose)." >&2
  exit 1
fi

"${compose[@]}" config --quiet

cleanup() {
  "${compose[@]}" --profile test --profile mock down --remove-orphans || true
}
trap cleanup EXIT

echo "==> Linting OpenAPI contracts"
"${compose[@]}" run --rm spectral
"${compose[@]}" run --rm spectral-asyncapi

echo "==> Checking root contract compatibility"
"${compose[@]}" run --rm oasdiff

echo "==> Building demo, language-native clients, and Playwright API suites"
"${compose[@]}" build app wiremock wiremock-integration-test
"${compose[@]}" --profile test --profile mock build rust-api-integration-test go-api-integration-test python-api-integration-test \
  js-api-integration-test ts-api-integration-test playwright-api-integration-test playwright-consumer-contract-test \
  java-api-integration-test csharp-api-integration-test

echo "==> Evaluating repository structure, test coverage, pipeline wiring, and roadmap"
"${compose[@]}" --profile test --profile mock run --rm project-evals

"${compose[@]}" up -d wiremock app

# This service waits for both endpoints, exercises the app, and verifies the
# matching call appears in WireMock's request journal.
"${compose[@]}" run --rm wiremock-integration-test

# Check the WireMock stub itself and then the app that consumes that stub.
"${compose[@]}" run --rm specmatic-downstream
"${compose[@]}" run --rm specmatic-provider
"${compose[@]}" run --rm specmatic-examples-validate

echo "==> Fuzzing the running demo against its OAS"
"${compose[@]}" run --rm schemathesis

echo "==> Chaining linked order operations with stateful Schemathesis"
"${compose[@]}" --profile test --profile mock build stateful-app
"${compose[@]}" --profile test --profile mock run --rm stateful-schemathesis

echo "==> Running language-native and Playwright OAS integration suites"
"${compose[@]}" run --rm rust-api-integration-test
"${compose[@]}" run --rm go-api-integration-test
"${compose[@]}" run --rm python-api-integration-test
"${compose[@]}" run --rm js-api-integration-test
"${compose[@]}" run --rm ts-api-integration-test
"${compose[@]}" run --rm playwright-api-integration-test
"${compose[@]}" run --rm java-api-integration-test
"${compose[@]}" run --rm csharp-api-integration-test

echo "==> Checking Specmatic examples and dictionary-backed mock responses"
"${compose[@]}" --profile mock up -d specmatic-mock
"${compose[@]}" --profile test --profile mock run --rm specmatic-mock-integration-test
echo "==> Running JavaScript and Playwright consumer suites against the Specmatic Smart Mock"
"${compose[@]}" --profile test --profile mock run --rm js-consumer-contract-test
"${compose[@]}" --profile mock run --rm playwright-consumer-contract-test

echo "==> Contract pipeline passed"

