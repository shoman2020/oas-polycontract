package nl.shiftleft;

import static org.hamcrest.Matchers.equalTo;

import com.atlassian.oai.validator.restassured.OpenApiValidationFilter;
import io.restassured.response.Response;
import java.nio.file.Path;
import java.util.Map;
import org.junit.jupiter.api.Test;

class ProductApiIntegrationTest {
    @Test
    void productResponseMatchesOpenApiContract() throws Exception {
        Map<String, Object> scenario = FeatureCases.byId("product.available");
        String specUrl = Path.of(System.getenv("OPENAPI_SPEC")).toUri().toURL().toString();
        OpenApiValidationFilter validation = new OpenApiValidationFilter(specUrl);

        ProductApi api = new ProductApiClient(System.getenv("API_BASE_URL"), validation);
        api.getProduct((String) scenario.get("sku"))
        .then()
            .statusCode(((Number) scenario.get("expectedStatus")).intValue())
            .body("sku", equalTo(scenario.get("sku")))
            .body("available", equalTo(((Number) scenario.get("available")).intValue()));

        System.out.println("OAS validation passed: GET /products/" + scenario.get("sku") + " -> " + scenario.get("expectedStatus"));
    }

    @Test
    void productErrorFeaturesMatchOpenApiContract() {
        String specUrl = Path.of(System.getenv("OPENAPI_SPEC")).toUri().toString();
        OpenApiValidationFilter validation = new OpenApiValidationFilter(specUrl);
        ProductApi api = new ProductApiClient(System.getenv("API_BASE_URL"), validation);

        for (String caseId : new String[] {"product.not-found", "product.bad-upstream", "product.malformed-path"}) {
            Map<String, Object> scenario = FeatureCases.byId(caseId);
            Response response = scenario.containsKey("path")
                ? api.getProductPath((String) scenario.get("path"))
                : api.getProduct((String) scenario.get("sku"));
            response.then()
                .statusCode(((Number) scenario.get("expectedStatus")).intValue())
                .body("message", equalTo(scenario.get("expectedMessage")));
        }
    }
}

