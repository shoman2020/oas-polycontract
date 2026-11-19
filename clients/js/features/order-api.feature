Feature: Stateful Order lifecycle
  Consumers create an order and move it through valid states.

  Scenario: Create and confirm an order idempotently
    Given the Order API is ready
    When a client creates an order for 2 units of "demo-sku"
    And the client sets the status to "confirmed" twice
    Then both updates return 200 with status "confirmed"

  Scenario: Reject an invalid order
    When a client creates an order with SKU "" and quantity 0
    Then the response is 400 and matches the Order error contract

  Scenario: Reject an illegal state transition
    Given an order for 1 unit of "demo-sku" has been cancelled
    When a client changes its status to "confirmed"
    Then the response is 409 and the order state is unchanged

  Scenario: Reject an unsupported method
    When a client posts to the Order health endpoint
    Then the response is 405 and allows "GET"
