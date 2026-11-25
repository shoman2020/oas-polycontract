import pytest
from openapi_core.contrib.requests import RequestsOpenAPIRequest, RequestsOpenAPIResponse


def test_product_response_matches_openapi_contract(product_api_client, openapi_contract, feature_cases):
    scenario = feature_cases["product.available"]
    request, response = product_api_client.get_product(scenario["sku"])

    openapi_contract.validate_response(
        RequestsOpenAPIRequest(request),
        RequestsOpenAPIResponse(response),
    )
    body = response.json()
    assert response.status_code == scenario["expectedStatus"]
    assert body["sku"] == scenario["sku"]
    assert body["available"] == scenario["available"]
    print(f"OAS validation passed: GET /products/demo-sku -> {response.status_code}")


@pytest.mark.parametrize("case_id", ["product.not-found", "product.bad-upstream"])
def test_product_error_responses_match_openapi_contract(
    product_api_client,
    openapi_contract,
    feature_cases,
    case_id,
):
    scenario = feature_cases[case_id]
    request, response = product_api_client.get_product(scenario["sku"])
    openapi_contract.validate_response(
        RequestsOpenAPIRequest(request),
        RequestsOpenAPIResponse(response),
    )
    assert response.status_code == scenario["expectedStatus"]
    assert response.json()["message"] == scenario["expectedMessage"]


def test_invalid_utf8_path_returns_contract_compliant_400(
    product_api_client,
    openapi_contract,
    feature_cases,
):
    scenario = feature_cases["product.malformed-path"]
    request, response = product_api_client.get_product_path(scenario["path"])
    try:
        openapi_contract.validate_response(
            RequestsOpenAPIRequest(request),
            RequestsOpenAPIResponse(response),
        )
        assert response.status_code == scenario["expectedStatus"]
        assert response.json() == {"message": scenario["expectedMessage"]}
    finally:
        response.close()

