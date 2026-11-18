#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

set -a
source .github/versions.env
set +a

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "Node.js ${NODE_VERSION} and npm ${NPM_VERSION} are required." >&2
  exit 1
fi

actual_node="$(node -p 'process.versions.node.split(".")[0]')"
actual_npm="$(npm --version)"
if [[ "$actual_node" != "$NODE_VERSION" || "$actual_npm" != "$NPM_VERSION" ]]; then
  echo "Expected Node.js ${NODE_VERSION} and npm ${NPM_VERSION}; found ${actual_node} and ${actual_npm}." >&2
  exit 1
fi

npm ci --prefix pipeline --no-audit --no-fund
npm --prefix pipeline test
exec node pipeline/run.mjs

