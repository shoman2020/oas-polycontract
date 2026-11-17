from openapi_core.contrib.requests import RequestsOpenAPIRequest, RequestsOpenAPIResponse


def test_product_response_matches_openapi_contract(product_api_client, openapi_contract):
    request, response = product_api_client.get_product("demo-sku")

    openapi_contract.validate_response(
        RequestsOpenAPIRequest(request),
        RequestsOpenAPIResponse(response),
    )
    body = response.json()
    assert body["sku"] == "demo-sku"
    assert body["available"] == 7
    print(f"OAS validation passed: GET /products/demo-sku -> {response.status_code}")

