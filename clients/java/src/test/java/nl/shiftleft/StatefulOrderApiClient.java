package nl.shiftleft;

import com.atlassian.oai.validator.restassured.OpenApiValidationFilter;
import io.restassured.response.Response;
import java.util.Map;

final class StatefulOrderApiClient extends HttpApiClient implements StatefulOrderApi {
    StatefulOrderApiClient(String baseUri, OpenApiValidationFilter contractFilter) {
        super(baseUri, contractFilter);
    }

    public Response createOrder(String sku, int quantity) {
        return request()
            .contentType("application/json")
            .body(Map.of("sku", sku, "quantity", quantity))
        .when()
            .post("/orders");
    }

    public Response createOrderUnvalidated(String sku, int quantity) {
        return requestWithoutContractValidation()
            .contentType("application/json")
            .body(Map.of("sku", sku, "quantity", quantity))
        .when()
            .post("/orders");
    }

    public Response getOrder(String orderId) {
        return request()
            .pathParam("orderId", orderId)
        .when()
            .get("/orders/{orderId}");
    }

    public Response updateOrder(String orderId, String status) {
        return request()
            .contentType("application/json")
            .pathParam("orderId", orderId)
            .body(Map.of("status", status))
        .when()
            .patch("/orders/{orderId}");
    }

    public Response deleteOrder(String orderId) {
        return request()
            .pathParam("orderId", orderId)
        .when()
            .delete("/orders/{orderId}");
    }
}
