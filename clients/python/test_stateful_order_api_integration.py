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
