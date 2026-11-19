import os
import requests

from openapi_core.contrib.requests import RequestsOpenAPIRequest, RequestsOpenAPIResponse


def validate_response(stateful_openapi_contract, request, response):
    stateful_openapi_contract.validate_response(
        RequestsOpenAPIRequest(request),
        RequestsOpenAPIResponse(response),
    )


def test_stateful_order_lifecycle_matches_openapi_contract(
    stateful_order_api_client,
    stateful_openapi_contract,
    feature_cases,
):
    scenario = feature_cases["order.confirm"]
    request, response = stateful_order_api_client.create_order(scenario["sku"], scenario["quantity"])
    validate_response(stateful_openapi_contract, request, response)
    assert response.status_code == 201
    order_id = response.json()["id"]
    assert response.json()["status"] == "created"

    request, response = stateful_order_api_client.get_order(order_id)
    validate_response(stateful_openapi_contract, request, response)
    assert response.status_code == 200
    assert response.json()["id"] == order_id

    for _ in range(scenario["repeatCount"]):
        request, response = stateful_order_api_client.update_order(order_id, scenario["status"])
        validate_response(stateful_openapi_contract, request, response)
        assert response.status_code == scenario["expectedStatus"]
        assert response.json()["status"] == scenario["status"]

    request, response = stateful_order_api_client.delete_order(order_id)
    validate_response(stateful_openapi_contract, request, response)
    assert response.status_code == 204
    assert response.content == b""

    request, response = stateful_order_api_client.get_order(order_id)
    validate_response(stateful_openapi_contract, request, response)
    assert response.status_code == 404
    assert response.json() == {"message": "Order not found"}
    print("Stateful OAS validation passed: create -> read -> confirm -> delete -> 404")


def test_order_validation_and_conflict_responses_match_openapi_contract(
    stateful_order_api_client,
    stateful_openapi_contract,
    feature_cases,
):
    invalid_case = feature_cases["order.invalid"]
    request, response = stateful_order_api_client.create_order(invalid_case["sku"], invalid_case["quantity"])
    validate_response(stateful_openapi_contract, request, response)
    assert response.status_code == invalid_case["expectedStatus"]

    scenario = feature_cases["order.illegal-transition"]
    request, response = stateful_order_api_client.create_order(scenario["sku"], scenario["quantity"])
    validate_response(stateful_openapi_contract, request, response)
    order_id = response.json()["id"]

    request, response = stateful_order_api_client.update_order(order_id, scenario["initialStatus"])
    validate_response(stateful_openapi_contract, request, response)
    assert response.status_code == 200

    request, response = stateful_order_api_client.update_order(order_id, scenario["initialStatus"])
    validate_response(stateful_openapi_contract, request, response)
    assert response.status_code == 200
    assert response.json()["status"] == scenario["persistedStatus"]

    request, response = stateful_order_api_client.update_order(order_id, scenario["requestedStatus"])
    validate_response(stateful_openapi_contract, request, response)
    assert response.status_code == scenario["expectedStatus"]

    request, response = stateful_order_api_client.get_order(order_id)
    validate_response(stateful_openapi_contract, request, response)
    assert response.status_code == 200
    assert response.json()["status"] == scenario["persistedStatus"]

    request, response = stateful_order_api_client.delete_order(order_id)
    validate_response(stateful_openapi_contract, request, response)
    assert response.status_code == 204


def test_unsupported_health_method_returns_contract_compliant_405(feature_cases):
    scenario = feature_cases["order.unsupported-method"]
    with requests.Session() as session:
        request = requests.Request(
            scenario["method"],
            f"{os.environ['STATEFUL_API_BASE_URL'].rstrip('/')}{scenario['path']}",
        )
        prepared_request = session.prepare_request(request)
        response = session.send(prepared_request, timeout=10)
        try:
            assert response.status_code == scenario["expectedStatus"]
            assert response.headers["Allow"] == scenario["allowedMethod"]
            assert isinstance(response.json()["message"], str)
        finally:
            response.close()
