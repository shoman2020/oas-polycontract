# API acceptance features

The [Product](product-api.feature) and [Order](order-api.feature) Gherkin files define acceptance scenarios and input data. A generator exports their JSON DocStrings to [shared case data](../shared/acceptance-cases.json), used by all seven native suites.

| API | Feature | Cucumber steps | Isolated service tests |
|---|---|---|---|
| Product | [product-api.feature](product-api.feature) | [product-api.steps.mjs](../js/bdd/product-api.steps.mjs) | [server.test.mjs](../../demo/app/tests/server.test.mjs) |
| Order | [order-api.feature](order-api.feature) | [order-api.steps.mjs](../js/bdd/order-api.steps.mjs) | [server.test.mjs](../../demo/stateful/server.test.mjs) |

Steps validate declared responses against the API's OAS. The unsupported-method scenario checks 405 and `Allow` directly. For behavior changes, update the scenario and write a failing service test before implementation.

Check generated data with `node clients/shared/generate-acceptance-cases.mjs --check`. The full test command is in the [README](../../README.md#run).
