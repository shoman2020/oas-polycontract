Feature: Product availability
  Consumers use the Product API to read inventory-backed availability.

  Scenario: Return availability for a known SKU
    Given Inventory has 7 units for "demo-sku"
    When a client requests that product
    Then the response is 200 and matches the Product contract

  Scenario: Report an unknown SKU
    Given Inventory has no record for "not-found-sku"
    When a client requests that product
    Then the response is 404 and explains that the inventory record is missing

  Scenario: Reject a malformed SKU path
    When a client requests a product with malformed percent encoding
    Then the response is 400 and matches the Error contract

  Scenario: Reject invalid data from Inventory
    Given Inventory returns an invalid record for "malformed-sku"
    When a client requests that product
    Then the response is 502 and hides the upstream payload
