package nl.shiftleft;

import com.atlassian.oai.validator.restassured.OpenApiValidationFilter;
import io.restassured.response.Response;

final class ProductApiClient extends HttpApiClient implements ProductApi {
    ProductApiClient(String baseUri, OpenApiValidationFilter contractFilter) {
        super(baseUri, contractFilter);
    }

    public Response getProduct(String sku) {
        return request()
            .pathParam("sku", sku)
        .when()
            .get("/products/{sku}");
    }

    public Response getProductPath(String path) {
        return request()
        .when()
            .get(path);
    }
}

