#!/usr/bin/env bash
# Phase 2 breaking-change gate. Requires oasdiff on PATH:
# https://github.com/oasdiff/oasdiff
#
# Usage:
#   gates/breaking-change/check.sh [path/to/candidate-openapi.yaml]
#
# Diffs the candidate spec (default: openapi/openapi.yaml) against the
# pinned openapi/openapi.base.yaml and exits non-zero if oasdiff finds a
# breaking change. Not yet wired into run.sh or CI, and not yet run here —
# this sandbox has neither the oasdiff binary nor network access to fetch
# it. See ROADMAP.md Phase 2.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
candidate="${1:-$repo_root/openapi/openapi.yaml}"
baseline="$repo_root/openapi/openapi.base.yaml"

if ! command -v oasdiff >/dev/null 2>&1; then
  echo "oasdiff is not on PATH — see https://github.com/oasdiff/oasdiff#installation" >&2
  exit 1
fi

oasdiff breaking "$baseline" "$candidate"
