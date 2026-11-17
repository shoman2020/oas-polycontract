package nl.shiftleft;

import com.atlassian.oai.validator.restassured.OpenApiValidationFilter;
import io.restassured.response.Response;
import java.util.Map;
import java.util.Objects;

final class StatefulOrderApiClient {
    private final String baseUri;
    private final OpenApiValidationFilter contractFilter;

    StatefulOrderApiClient(String baseUri, OpenApiValidationFilter contractFilter) {
        this.baseUri = Objects.requireNonNull(baseUri, "baseUri");
        this.contractFilter = Objects.requireNonNull(contractFilter, "contractFilter");
    }

    Response createOrder(String sku, int quantity) {
        return io.restassured.RestAssured.given()
            .baseUri(baseUri)
            .filter(contractFilter)
            .contentType("application/json")
            .body(Map.of("sku", sku, "quantity", quantity))
        .when()
            .post("/orders");
    }

    Response getOrder(String orderId) {
        return io.restassured.RestAssured.given()
            .baseUri(baseUri)
            .filter(contractFilter)
            .pathParam("orderId", orderId)
        .when()
            .get("/orders/{orderId}");
    }

    Response updateOrder(String orderId, String status) {
        return io.restassured.RestAssured.given()
            .baseUri(baseUri)
            .filter(contractFilter)
            .contentType("application/json")
            .pathParam("orderId", orderId)
            .body(Map.of("status", status))
        .when()
            .patch("/orders/{orderId}");
    }

    Response deleteOrder(String orderId) {
        return io.restassured.RestAssured.given()
            .baseUri(baseUri)
            .filter(contractFilter)
            .pathParam("orderId", orderId)
        .when()
            .delete("/orders/{orderId}");
    }
}
