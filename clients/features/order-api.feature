Feature: Stateful Order lifecycle
  Clients create orders and move them through valid states.

  Scenario: Create and confirm an order idempotently
    Given the acceptance data:
      """json
      {"caseId":"order.confirm","sku":"demo-sku","quantity":2,"status":"confirmed","repeatCount":2,"expectedStatus":200}
      """
    And the Order API is ready
    When a client creates an order for 2 units of "demo-sku"
    And the client sets the status to "confirmed" twice
    Then both updates return 200 with status "confirmed"

  Scenario: Reject an invalid order
    Given the acceptance data:
      """json
      {"caseId":"order.invalid","sku":"","quantity":0,"expectedStatus":400,"expectedMessage":"sku and quantity are invalid"}
      """
    When a client creates an order with SKU "" and quantity 0
    Then the response is 400 and matches the Order error contract

  Scenario: Reject an illegal state transition
    Given the acceptance data:
      """json
      {"caseId":"order.illegal-transition","sku":"demo-sku","quantity":1,"initialStatus":"cancelled","repeatCount":2,"requestedStatus":"confirmed","expectedStatus":409,"persistedStatus":"cancelled"}
      """
    And an order for 1 unit of "demo-sku" has been cancelled idempotently
    When a client changes its status to "confirmed"
    Then the response is 409 and the order state is unchanged

  Scenario: Reject an unsupported method
    Given the acceptance data:
      """json
      {"caseId":"order.unsupported-method","method":"POST","path":"/healthz","expectedStatus":405,"allowedMethod":"GET"}
      """
    When a client posts to the Order health endpoint
    Then the response is 405 and allows "GET"
