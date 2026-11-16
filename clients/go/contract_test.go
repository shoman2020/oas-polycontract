package contract

import (
	"context"
	"io"
	"os"
	"testing"

	"github.com/getkin/kin-openapi/openapi3"
	"github.com/getkin/kin-openapi/openapi3filter"
	"github.com/getkin/kin-openapi/routers/gorillamux"
)

func TestProductResponseMatchesOpenAPIContract(t *testing.T) {
	ctx := context.Background()
	loader := openapi3.NewLoader()
	spec, err := loader.LoadFromFile(os.Getenv("OPENAPI_SPEC"))
	if err != nil {
		t.Fatal(err)
	}
	if err := spec.Validate(ctx); err != nil {
		t.Fatalf("invalid OpenAPI document: %v", err)
	}
	router, err := gorillamux.NewRouter(spec)
	if err != nil {
		t.Fatal(err)
	}

	client, err := NewProductAPIClient(os.Getenv("API_BASE_URL"))
	if err != nil {
		t.Fatal(err)
	}
	response, err := client.GetProduct(ctx, "demo-sku")
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()
	request := response.Request
	route, pathParams, err := router.FindRoute(request)
	if err != nil {
		t.Fatalf("operation not found in OAS: %v", err)
	}

	body, err := io.ReadAll(response.Body)
	if err != nil {
		t.Fatal(err)
	}
	requestInput := &openapi3filter.RequestValidationInput{
		Request: request, PathParams: pathParams, Route: route,
	}
	responseInput := &openapi3filter.ResponseValidationInput{
		RequestValidationInput: requestInput,
		Status: response.StatusCode,
		Header: response.Header,
		Options: &openapi3filter.Options{IncludeResponseStatus: true},
	}
	responseInput.SetBodyBytes(body)
	if err := openapi3filter.ValidateResponse(ctx, responseInput); err != nil {
		t.Fatalf("response does not match OAS: %v", err)
	}

	t.Logf("OAS validation passed: GET /products/demo-sku -> %d", response.StatusCode)
}

