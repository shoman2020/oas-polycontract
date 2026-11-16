#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

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

"${compose[@]}" build app wiremock wiremock-integration-test
"${compose[@]}" up -d wiremock app

# This service waits for both endpoints, exercises the app, and verifies the
# matching call appears in WireMock's request journal.
"${compose[@]}" run --rm wiremock-integration-test

# Check the WireMock stub itself and then the app that consumes that stub.
"${compose[@]}" run --rm specmatic-downstream
"${compose[@]}" run --rm specmatic-provider
"${compose[@]}" run --rm specmatic-examples-validate
