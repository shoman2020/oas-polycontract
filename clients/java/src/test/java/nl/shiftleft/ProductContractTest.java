package nl.shiftleft;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;

import com.atlassian.oai.validator.restassured.OpenApiValidationFilter;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

class ProductContractTest {
    @Test
    void productResponseMatchesOpenApiContract() throws Exception {
        String specUrl = Path.of(System.getenv("OPENAPI_SPEC")).toUri().toURL().toString();
        OpenApiValidationFilter validation = new OpenApiValidationFilter(specUrl);

        given()
            .baseUri(System.getenv("API_BASE_URL"))
            .filter(validation)
        .when()
            .get("/products/demo-sku")
        .then()
            .statusCode(200)
            .body("sku", equalTo("demo-sku"))
            .body("available", equalTo(7));

        System.out.println("OAS validation passed: GET /products/demo-sku -> 200");
    }
}
