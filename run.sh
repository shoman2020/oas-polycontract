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

cleanup() {
  "${compose[@]}" --profile test --profile mock down --remove-orphans || true
}

declare -a stage_names=()
declare -a stage_seconds=()
pipeline_started=$SECONDS
stage_name=""
stage_started=0
timings_file="${PIPELINE_TIMINGS_FILE:-.artifacts/pipeline-timings.csv}"

start_stage() {
  stage_name="$1"
  stage_started=$SECONDS
  echo "==> $stage_name"
}

finish_stage() {
  stage_names+=("$stage_name")
  stage_seconds+=("$((SECONDS - stage_started))")
  stage_name=""
}

write_timing_report() {
  local status="$1"
  local total_seconds="$((SECONDS - pipeline_started))"
  local result="passed"
  [[ "$status" -eq 0 ]] || result="failed"

  if [[ -n "$stage_name" ]]; then
    stage_names+=("$stage_name")
    stage_seconds+=("$((SECONDS - stage_started))")
  fi

  mkdir -p "$(dirname "$timings_file")"
  {
    printf 'stage,seconds,result\n'
    for index in "${!stage_names[@]}"; do
      local stage_result="passed"
      [[ "$status" -eq 0 || "$index" -lt "$((${#stage_names[@]} - 1))" ]] || stage_result="failed"
      printf '"%s",%s,%s\n' "${stage_names[$index]}" "${stage_seconds[$index]}" "$stage_result"
    done
    printf 'total,%s,%s\n' "$total_seconds" "$result"
  } > "$timings_file"

  render_timing_summary() {
    printf '\n### Pipeline timings\n\n| Stage | Seconds | Result |\n|---|---:|---|\n'
    for index in "${!stage_names[@]}"; do
      local stage_result="passed"
      [[ "$status" -eq 0 || "$index" -lt "$((${#stage_names[@]} - 1))" ]] || stage_result="failed"
      printf '| %s | %s | %s |\n' "${stage_names[$index]}" "${stage_seconds[$index]}" "$stage_result"
    done
    printf '| **Total** | **%s** | **%s** |\n' "$total_seconds" "$result"
  }

  render_timing_summary | tee /dev/stderr

  if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
    render_timing_summary >> "$GITHUB_STEP_SUMMARY"
  fi
}

finish_pipeline() {
  local status=$?
  trap - EXIT
  cleanup
  write_timing_report "$status"
  exit "$status"
}
trap finish_pipeline EXIT

start_stage "Compose configuration"
"${compose[@]}" config --quiet
finish_stage

start_stage "Contract lint"
"${compose[@]}" run --rm spectral
"${compose[@]}" run --rm spectral-asyncapi
finish_stage

start_stage "Compatibility"
"${compose[@]}" run --rm oasdiff
finish_stage

start_stage "Build"
"${compose[@]}" build app wiremock wiremock-integration-test
"${compose[@]}" --profile test --profile mock build rust-api-integration-test go-api-integration-test python-api-integration-test \
  js-api-integration-test ts-api-integration-test playwright-api-integration-test playwright-consumer-contract-test \
  java-api-integration-test csharp-api-integration-test
finish_stage

start_stage "Repository evaluations"
"${compose[@]}" --profile test --profile mock run --rm project-evals
finish_stage

start_stage "Provider and downstream contract tests"
"${compose[@]}" up -d wiremock app

# This service waits for both endpoints, exercises the app, and verifies the
# matching call appears in WireMock's request journal.
"${compose[@]}" run --rm wiremock-integration-test

# Check the WireMock stub itself and then the app that consumes that stub.
"${compose[@]}" run --rm specmatic-downstream
"${compose[@]}" run --rm specmatic-provider
"${compose[@]}" run --rm specmatic-examples-validate
finish_stage

start_stage "Stateless fuzzing"
"${compose[@]}" run --rm schemathesis
finish_stage

start_stage "Stateful API tests"
"${compose[@]}" --profile test --profile mock build stateful-app
"${compose[@]}" --profile test --profile mock run --rm stateful-schemathesis
finish_stage

start_stage "Native API integration suites"
"${compose[@]}" run --rm rust-api-integration-test
"${compose[@]}" run --rm go-api-integration-test
"${compose[@]}" run --rm python-api-integration-test
"${compose[@]}" run --rm js-api-integration-test
"${compose[@]}" run --rm ts-api-integration-test
"${compose[@]}" run --rm playwright-api-integration-test
"${compose[@]}" run --rm java-api-integration-test
"${compose[@]}" run --rm csharp-api-integration-test
finish_stage

start_stage "Consumer contract tests and mock evaluations"
"${compose[@]}" --profile mock up -d specmatic-mock
"${compose[@]}" --profile test --profile mock run --rm specmatic-mock-integration-test
echo "==> Running JavaScript and Playwright consumer suites against the Specmatic Smart Mock"
"${compose[@]}" --profile test --profile mock run --rm js-consumer-contract-test
"${compose[@]}" --profile mock run --rm playwright-consumer-contract-test
finish_stage

echo "==> Contract pipeline passed"

