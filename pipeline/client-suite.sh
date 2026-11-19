#!/bin/sh
set -eu

client_source=${CLIENT_SOURCE:?CLIENT_SOURCE is required}
suite=${CLIENT_SUITE:?CLIENT_SUITE is required}
client_features_source=${CLIENT_FEATURES_SOURCE:-}
export HOME=/tmp/oas-home
mkdir -p "$HOME"

case "$suite" in
  rust)
    export CARGO_HOME=/tmp/oas-cargo
    export CARGO_TARGET_DIR=/tmp/oas-rust-target
    cd "$client_source"
    cargo test --locked -- --nocapture
    ;;
  go)
    export GOPATH=/tmp/oas-go
    export GOMODCACHE=/tmp/oas-go-modules
    export GOCACHE=/tmp/oas-go-cache
    cd "$client_source"
    go test -mod=readonly -v ./...
    ;;
  python)
    export PYTHONDONTWRITEBYTECODE=1
    python -m venv /tmp/oas-python
    /tmp/oas-python/bin/pip install --no-cache-dir --require-hashes -r "$client_source/requirements.lock"
    cd "$client_source"
    /tmp/oas-python/bin/pytest -v -s -p no:cacheprovider
    ;;
  js|js-bdd|js-canary|js-consumer|ts|playwright|playwright-consumer)
    workspace="/tmp/oas-${suite}"
    mkdir -p "$workspace"
    cp -R "$client_source"/. "$workspace"/
    if [ "$suite" = js-bdd ]; then
      [ -n "$client_features_source" ] || { echo "CLIENT_FEATURES_SOURCE is required for the BDD suite" >&2; exit 2; }
      cp -R "$client_features_source" "$workspace/features"
    fi
    mkdir -p /tmp/oas-npm
    npm install --prefix /tmp/oas-npm "npm@${NPM_VERSION:?NPM_VERSION is required}" --no-audit --no-fund
    export PATH="/tmp/oas-npm/node_modules/.bin:$PATH"
    cd "$workspace"
    npm ci --no-audit --no-fund
    case "$suite" in
      js) npm test ;;
      js-bdd) npm run test:bdd ;;
      js-canary) node --test product-api-integration.test.mjs ;;
      js-consumer) npm run test:consumer ;;
      ts) npx tsc --noEmit && npm test ;;
      playwright) npm run test:provider ;;
      playwright-consumer) npm run test:consumer ;;
    esac
    ;;
  java)
    workspace=/tmp/oas-java
    mkdir -p "$workspace"
    cp -R "$client_source"/. "$workspace"/
    mvn -B -ntp -f "$workspace/pom.xml" -Dmaven.repo.local=/tmp/oas-maven-repository test
    ;;
  csharp)
    workspace=/tmp/oas-csharp
    mkdir -p "$workspace"
    cp -R "$client_source"/. "$workspace"/
    export DOTNET_CLI_HOME=/tmp/oas-dotnet-home
    export NUGET_PACKAGES=/tmp/oas-nuget
    export DOTNET_CLI_WORKLOAD_UPDATE_NOTIFY_DISABLE=true
    dotnet restore "$workspace/ContractTests.csproj" --locked-mode
    dotnet test "$workspace/ContractTests.csproj" --no-restore
    ;;
  *)
    echo "Unsupported client suite: $suite" >&2
    exit 2
    ;;
esac
