package nl.shiftleft;

import com.atlassian.oai.validator.restassured.OpenApiValidationFilter;
import io.restassured.response.Response;
import java.util.Objects;

final class ProductApiClient {
    private final String baseUri;
    private final OpenApiValidationFilter contractFilter;

    ProductApiClient(String baseUri, OpenApiValidationFilter contractFilter) {
        this.baseUri = Objects.requireNonNull(baseUri, "baseUri");
        this.contractFilter = Objects.requireNonNull(contractFilter, "contractFilter");
    }

    Response getProduct(String sku) {
        return io.restassured.RestAssured.given()
            .baseUri(baseUri)
            .filter(contractFilter)
            .pathParam("sku", sku)
        .when()
            .get("/products/{sku}");
    }
}

