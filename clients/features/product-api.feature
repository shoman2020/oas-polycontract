Feature: Product availability
  Clients use the Product API to read inventory-backed availability.

  Scenario: Return availability for a known SKU
    Given the acceptance data:
      """json
      {"caseId":"product.available","sku":"demo-sku","available":7,"expectedStatus":200}
      """
    And Inventory has 7 units for "demo-sku"
    When a client requests that product
    Then the response is 200 and matches the Product contract

  Scenario: Report an unknown SKU
    Given the acceptance data:
      """json
      {"caseId":"product.not-found","sku":"not-found-sku","expectedStatus":404,"expectedMessage":"No inventory record for not-found-sku"}
      """
    And Inventory has no record for "not-found-sku"
    When a client requests that product
    Then the response is 404 and explains that the inventory record is missing

  Scenario: Reject a SKU path with invalid UTF-8 percent encoding
    Given the acceptance data:
      """json
      {"caseId":"product.malformed-path","path":"/products/%E0%A4%41","expectedStatus":400,"expectedMessage":"Invalid SKU encoding"}
      """
    When a client requests a product with invalid UTF-8 path encoding
    Then the response is 400 and matches the Error contract

  Scenario: Reject invalid data from Inventory
    Given the acceptance data:
      """json
      {"caseId":"product.bad-upstream","sku":"malformed-sku","expectedStatus":502,"expectedMessage":"Inventory service unavailable"}
      """
    And Inventory returns an invalid record for "malformed-sku"
    When a client requests that product
    Then the response is 502 and hides the upstream payload
