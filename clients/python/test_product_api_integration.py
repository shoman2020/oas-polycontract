import os

import pytest
import requests
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


@pytest.mark.parametrize(
    ("sku", "expected_status", "expected_message"),
    [
        ("not-found-sku", 404, "No inventory record for not-found-sku"),
        ("malformed-sku", 502, "Inventory service unavailable"),
    ],
)
def test_product_error_responses_match_openapi_contract(
    product_api_client,
    openapi_contract,
    sku,
    expected_status,
    expected_message,
):
    request, response = product_api_client.get_product(sku)

    openapi_contract.validate_response(
        RequestsOpenAPIRequest(request),
        RequestsOpenAPIResponse(response),
    )
    assert response.status_code == expected_status
    assert response.json()["message"] == expected_message


def test_malformed_sku_path_returns_contract_compliant_400(openapi_contract):
    session = requests.Session()
    request = requests.Request(
        "GET",
        f"{os.environ['API_BASE_URL'].rstrip('/')}/products/%E0%A4%A",
    )
    prepared_request = session.prepare_request(request)
    response = session.send(prepared_request, timeout=10)

    openapi_contract.validate_response(
        RequestsOpenAPIRequest(prepared_request),
        RequestsOpenAPIResponse(response),
    )
    assert response.status_code == 400
    assert response.json() == {"message": "Invalid SKU encoding"}
    response.close()
    session.close()

