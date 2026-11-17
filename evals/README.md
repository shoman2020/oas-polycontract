# Repository evaluations

`project-evals.json` defines checks for documentation links, the README
structure map, native test entry points, test-role and target mapping, pipeline
wiring, workflow visuals, and roadmap phase tracking. `run.mjs` evaluates
those checks using Node.js built-ins only.

`mock-data-evals.json` defines exact expectations for request-matched fixtures
and allowed values for dictionary-backed fallback responses. The Specmatic
mock integration test reads this data and checks the running mock. It keeps
generated or hand-authored mock data reviewable and deterministic cases
repeatable; no model is called by CI.

`bash ./run.sh` runs these evaluations before the contract gates. To run them
directly with a local Node.js runtime, run:

```sh
node evals/run.mjs
```

To run them in the pinned demo image:

```sh
docker compose --env-file .github/versions.env build app
docker compose --env-file .github/versions.env --profile test run --rm project-evals
```

The checks protect repository claims and wiring. They complement the API,
contract, security, and language test suites; they do not replace them.
