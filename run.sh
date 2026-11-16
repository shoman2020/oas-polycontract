#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

compose=(docker compose -f docker-compose.yml)

cleanup() {
  "${compose[@]}" down --remove-orphans || true
}
trap cleanup EXIT

"${compose[@]}" build app wiremock-integration-test
"${compose[@]}" up -d wiremock app

# This service waits for both endpoints, exercises the app, and verifies the
# matching call appears in WireMock's request journal.
"${compose[@]}" run --rm wiremock-integration-test

# Check the WireMock stub itself and then the app that consumes that stub.
"${compose[@]}" run --rm specmatic-downstream
"${compose[@]}" run --rm specmatic-provider
