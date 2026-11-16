import os

import requests
from openapi_core import OpenAPI
from openapi_core.contrib.requests import RequestsOpenAPIRequest, RequestsOpenAPIResponse


def test_product_response_matches_openapi_contract():
    spec = OpenAPI.from_file_path(os.environ["OPENAPI_SPEC"])
    request = requests.Request("GET", f"{os.environ['API_BASE_URL']}/products/demo-sku")
    session = requests.Session()
    prepared = session.prepare_request(request)
    response = session.send(prepared, timeout=10)

    spec.validate_response(
        RequestsOpenAPIRequest(request),
        RequestsOpenAPIResponse(response),
    )
    body = response.json()
    assert body["sku"] == "demo-sku"
    assert body["available"] == 7
    print(f"OAS validation passed: GET /products/demo-sku -> {response.status_code}")
