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
  "${compose[@]}" down --remove-orphans || true
}
trap cleanup EXIT

echo "==> Linting OpenAPI contracts"
"${compose[@]}" run --rm spectral
"${compose[@]}" run --rm spectral-asyncapi

echo "==> Checking root contract compatibility"
"${compose[@]}" run --rm oasdiff

echo "==> Building demo and language-native test clients"
"${compose[@]}" build app wiremock wiremock-integration-test
"${compose[@]}" build rust-contract-test go-contract-test python-contract-test \
  js-contract-test ts-contract-test java-contract-test csharp-contract-test
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

echo "==> Running language-native OAS integration suites"
"${compose[@]}" run --rm rust-contract-test
"${compose[@]}" run --rm go-contract-test
"${compose[@]}" run --rm python-contract-test
"${compose[@]}" run --rm js-contract-test
"${compose[@]}" run --rm ts-contract-test
"${compose[@]}" run --rm java-contract-test
"${compose[@]}" run --rm csharp-contract-test

echo "==> Checking Specmatic examples and dictionary-backed mock responses"
"${compose[@]}" --profile mock up -d specmatic-mock
"${compose[@]}" run --rm specmatic-mock-integration-test
"${compose[@]}" run --rm -e API_BASE_URL=http://specmatic-mock:9000 js-contract-test

echo "==> Contract pipeline passed"
