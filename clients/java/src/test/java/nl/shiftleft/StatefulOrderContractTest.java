package nl.shiftleft;

import static org.hamcrest.Matchers.equalTo;

import com.atlassian.oai.validator.restassured.OpenApiValidationFilter;
import io.restassured.response.Response;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

class StatefulOrderContractTest {
    @Test
    void orderLifecycleResponsesMatchOpenApiContract() throws Exception {
        String specUrl = Path.of(System.getenv("STATEFUL_OPENAPI_SPEC")).toUri().toURL().toString();
        OpenApiValidationFilter validation = new OpenApiValidationFilter(specUrl);
        StatefulOrderApiClient api = new StatefulOrderApiClient(
            System.getenv("STATEFUL_API_BASE_URL"), validation);

        Response created = api.createOrder("demo-sku", 2)
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

        api.updateOrder(orderId, "confirmed")
            .then()
            .statusCode(200)
            .body("status", equalTo("confirmed"));

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
}
