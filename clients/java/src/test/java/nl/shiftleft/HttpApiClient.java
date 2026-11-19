package nl.shiftleft;

import com.atlassian.oai.validator.restassured.OpenApiValidationFilter;
import io.restassured.RestAssured;
import io.restassured.specification.RequestSpecification;
import java.util.Objects;

abstract class HttpApiClient {
    private final String baseUri;
    private final OpenApiValidationFilter contractFilter;

    HttpApiClient(String baseUri, OpenApiValidationFilter contractFilter) {
        this.baseUri = Objects.requireNonNull(baseUri, "baseUri");
        this.contractFilter = Objects.requireNonNull(contractFilter, "contractFilter");
    }

    protected RequestSpecification request() {
        return RestAssured.given().baseUri(baseUri).filter(contractFilter);
    }

    protected RequestSpecification requestWithoutContractValidation() {
        return RestAssured.given().baseUri(baseUri);
    }
}
