import os

import pytest
import requests
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


def test_invalid_utf8_path_returns_contract_compliant_400(openapi_contract, feature_cases):
    base_url = os.environ["API_BASE_URL"].rstrip("/")
    scenario = feature_cases["product.malformed-path"]
    malformed_url = f"{base_url}{scenario['path']}"

    with requests.Session() as session:
        prepared_request = session.prepare_request(requests.Request("GET", malformed_url))
        response = session.send(prepared_request, timeout=10)
        try:
            openapi_contract.validate_response(
                RequestsOpenAPIRequest(prepared_request),
                RequestsOpenAPIResponse(response),
            )
            assert response.status_code == scenario["expectedStatus"]
            assert response.json() == {"message": scenario["expectedMessage"]}
        finally:
            response.close()

