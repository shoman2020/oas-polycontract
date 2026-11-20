#!/usr/bin/env bash
# Phase 2 breaking-change gate. Requires oasdiff on PATH:
# https://github.com/oasdiff/oasdiff
#
# Usage:
#   gates/breaking-change/check.sh [path/to/candidate-openapi.yaml]
#
# Diffs the candidate spec (default: openapi/openapi.yaml) against the
# pinned openapi/openapi.base.yaml and exits non-zero if oasdiff finds a
# breaking change. This is a manual/local convenience and requires a local
# oasdiff binary. Contract CI runs the same check through runOasDiff() in
# pipeline/run.mjs using the pinned oasdiff container.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
candidate="${1:-$repo_root/openapi/openapi.yaml}"
baseline="$repo_root/openapi/openapi.base.yaml"

if ! command -v oasdiff >/dev/null 2>&1; then
  echo "oasdiff is not on PATH — see https://github.com/oasdiff/oasdiff#installation" >&2
  exit 1
fi

oasdiff breaking --fail-on ERR "$baseline" "$candidate"
