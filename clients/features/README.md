# API acceptance features

Product and Order feature files hold acceptance behavior and input data. Each scenario includes a JSON DocString. The generator exports that data to [acceptance-cases.json](../shared/acceptance-cases.json), which all seven native language suites read. Run the generator after editing a feature; run.sh checks that the exported data is current.

| API | Feature | Cucumber steps | Isolated service tests |
|---|---|---|---|
| Product | [product-api.feature](product-api.feature) | [product-api.steps.mjs](../js/bdd/product-api.steps.mjs) | [server.test.mjs](../../demo/app/tests/server.test.mjs) |
| Order | [order-api.feature](order-api.feature) | [order-api.steps.mjs](../js/bdd/order-api.steps.mjs) | [server.test.mjs](../../demo/stateful/server.test.mjs) |

Shared Cucumber support lives in [support.mjs](../js/bdd/support.mjs). API-specific steps use language clients and validate declared responses against the matching OAS. The unsupported-method scenario checks HTTP 405 and Allow directly because that method is outside the OAS operation list.

The pipeline runs unit tests before provider, fuzzing, and live integration gates. Write a failing isolated service test for a behavior change, update its feature data, then implement the change and verify it through the native suites.

Run the full pipeline with bash ./run.sh. Regenerate case data with node clients/shared/generate-acceptance-cases.mjs.
