package nl.shiftleft;

import static org.hamcrest.Matchers.equalTo;

import com.atlassian.oai.validator.restassured.OpenApiValidationFilter;
import io.restassured.RestAssured;
import io.restassured.response.Response;
import java.nio.file.Path;
import java.util.Map;
import org.junit.jupiter.api.Test;

class StatefulOrderApiIntegrationTest {
    @Test
    void orderLifecycleResponsesMatchOpenApiContract() throws Exception {
        Map<String, Object> scenario = FeatureCases.byId("order.confirm");
        String specUrl = Path.of(System.getenv("STATEFUL_OPENAPI_SPEC")).toUri().toURL().toString();
        OpenApiValidationFilter validation = new OpenApiValidationFilter(specUrl);
        StatefulOrderApi api = new StatefulOrderApiClient(
            System.getenv("STATEFUL_API_BASE_URL"), validation);

        Response created = api.createOrder(
            (String) scenario.get("sku"),
            ((Number) scenario.get("quantity")).intValue())
            .then()
            .statusCode(201)
            .body("status", equalTo("created"))
            .extract()
            .response();
        String orderId = created.jsonPath().getString("id");

        api.getOrder(orderId)
            .then()
            .statusCode(200)
            .body("id", equalTo(orderId));

        for (int attempt = 0; attempt < ((Number) scenario.get("repeatCount")).intValue(); attempt++) {
            api.updateOrder(orderId, (String) scenario.get("status"))
                .then()
                .statusCode(((Number) scenario.get("expectedStatus")).intValue())
                .body("status", equalTo(scenario.get("status")));
        }

        api.deleteOrder(orderId)
            .then()
            .statusCode(204)
            .body(equalTo(""));

        api.getOrder(orderId)
            .then()
            .statusCode(404)
            .body("message", equalTo("Order not found"));

        System.out.println("Stateful OAS validation passed: create -> read -> confirm -> delete -> 404");
    }

    @Test
    void orderErrorFeaturesMatchOpenApiContract() throws Exception {
        String baseUri = System.getenv("STATEFUL_API_BASE_URL");
        String specUrl = Path.of(System.getenv("STATEFUL_OPENAPI_SPEC")).toUri().toURL().toString();
        OpenApiValidationFilter validation = new OpenApiValidationFilter(specUrl);
        StatefulOrderApi api = new StatefulOrderApiClient(baseUri, validation);

        Map<String, Object> invalid = FeatureCases.byId("order.invalid");
        api.createOrder((String) invalid.get("sku"), ((Number) invalid.get("quantity")).intValue())
            .then().statusCode(((Number) invalid.get("expectedStatus")).intValue());

        Map<String, Object> scenario = FeatureCases.byId("order.illegal-transition");
        Response created = api.createOrder((String) scenario.get("sku"), ((Number) scenario.get("quantity")).intValue())
            .then().statusCode(201).extract().response();
        String orderId = created.jsonPath().getString("id");
        for (int attempt = 0; attempt < ((Number) scenario.get("repeatCount")).intValue(); attempt++) {
            api.updateOrder(orderId, (String) scenario.get("initialStatus"))
                .then().statusCode(200).body("status", equalTo(scenario.get("persistedStatus")));
        }
        api.updateOrder(orderId, (String) scenario.get("requestedStatus"))
            .then().statusCode(((Number) scenario.get("expectedStatus")).intValue())
            .body("message", org.hamcrest.Matchers.containsString("Cannot change order"));
        api.getOrder(orderId)
            .then().statusCode(200).body("status", equalTo(scenario.get("persistedStatus")));
        api.deleteOrder(orderId).then().statusCode(204);

        Map<String, Object> unsupported = FeatureCases.byId("order.unsupported-method");
        RestAssured.given().baseUri(baseUri)
            .when().post((String) unsupported.get("path"))
            .then()
            .statusCode(((Number) unsupported.get("expectedStatus")).intValue())
            .header("Allow", equalTo(unsupported.get("allowedMethod")));
    }
}
