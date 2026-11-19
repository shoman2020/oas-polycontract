import os

import requests

from openapi_core.contrib.requests import RequestsOpenAPIRequest, RequestsOpenAPIResponse

def validate(stateful_openapi_contract, request, response):
    stateful_openapi_contract.validate_response(
        RequestsOpenAPIRequest(request),
        RequestsOpenAPIResponse(response),
    )


def test_stateful_order_lifecycle_matches_openapi_contract(
    stateful_order_api_client,
    stateful_openapi_contract,
):
    request, response = stateful_order_api_client.create_order("demo-sku", 2)
    validate(stateful_openapi_contract, request, response)
    assert response.status_code == 201
    order_id = response.json()["id"]
    assert response.json()["status"] == "created"

    request, response = stateful_order_api_client.get_order(order_id)
    validate(stateful_openapi_contract, request, response)
    assert response.status_code == 200
    assert response.json()["id"] == order_id

    request, response = stateful_order_api_client.update_order(order_id, "confirmed")
    validate(stateful_openapi_contract, request, response)
    assert response.status_code == 200
    assert response.json()["status"] == "confirmed"

    request, response = stateful_order_api_client.delete_order(order_id)
    validate(stateful_openapi_contract, request, response)
    assert response.status_code == 204
    assert response.content == b""

    request, response = stateful_order_api_client.get_order(order_id)
    validate(stateful_openapi_contract, request, response)
    assert response.status_code == 404
    assert response.json() == {"message": "Order not found"}
    print("Stateful OAS validation passed: create -> read -> confirm -> delete -> 404")


def test_order_validation_and_conflict_responses_match_openapi_contract(
    stateful_order_api_client,
    stateful_openapi_contract,
):
    request, response = stateful_order_api_client.create_order("", 0)
    validate(stateful_openapi_contract, request, response)
    assert response.status_code == 400

    request, response = stateful_order_api_client.create_order("demo-sku", 1)
    validate(stateful_openapi_contract, request, response)
    order_id = response.json()["id"]

    request, response = stateful_order_api_client.update_order(order_id, "cancelled")
    validate(stateful_openapi_contract, request, response)
    assert response.status_code == 200

    request, response = stateful_order_api_client.update_order(order_id, "cancelled")
    validate(stateful_openapi_contract, request, response)
    assert response.status_code == 200
    assert response.json()["status"] == "cancelled"

    request, response = stateful_order_api_client.update_order(order_id, "confirmed")
    validate(stateful_openapi_contract, request, response)
    assert response.status_code == 409

    request, response = stateful_order_api_client.delete_order(order_id)
    validate(stateful_openapi_contract, request, response)
    assert response.status_code == 204


def test_unsupported_health_method_returns_contract_compliant_405(stateful_openapi_contract):
    session = requests.Session()
    request = requests.Request(
        "POST",
        f"{os.environ['STATEFUL_API_BASE_URL'].rstrip('/')}/healthz",
    )
    prepared_request = session.prepare_request(request)
    response = session.send(prepared_request, timeout=10)

    assert response.status_code == 405
    assert response.headers["Allow"] == "GET"
    assert isinstance(response.json()["message"], str)
    response.close()
    session.close()
