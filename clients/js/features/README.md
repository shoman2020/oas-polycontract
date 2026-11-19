# API behavior scenarios

The Product and Order `.feature` files are the acceptance-test source. Cucumber reads their setup values, requests, and expected outcomes, then checks declared operations against OAS. The unsupported-method case checks HTTP 405, `Allow`, and the error body directly because that request method has no OAS operation.

| Acceptance scenarios | Isolated TDD tests | OAS-validated integration tests |
|---|---|---|
| [Product API](product-api.feature) | [`server.test.mjs`](../../../demo/app/tests/server.test.mjs) | [Cucumber steps](steps/api.steps.mjs), [JavaScript](../product-api-integration.test.mjs), [Python](../../python/test_product_api_integration.py) |
| [Order API](order-api.feature) | [`server.test.mjs`](../../../demo/stateful/server.test.mjs) | [Cucumber steps](steps/api.steps.mjs), [JavaScript](../stateful-order-api-integration.test.mjs), [Python](../../python/test_stateful_order_api_integration.py) |

The pipeline runs isolated service tests first, then contract and live API gates, including the Gherkin acceptance scenarios. This keeps fast TDD feedback separate from acceptance checks against running services.

Run the complete flow with `bash ./run.sh`. Run isolated service tests with `node --test demo/app/tests/server.test.mjs demo/stateful/server.test.mjs`. After starting the services, run Cucumber from Bash with:

```sh
API_BASE_URL=http://localhost:8080 \
OPENAPI_SPEC="$PWD/demo/openapi.yaml" \
STATEFUL_API_BASE_URL=http://localhost:8083 \
STATEFUL_OPENAPI_SPEC="$PWD/demo/stateful/openapi.yaml" \
npm run test:bdd --prefix clients/js
```
