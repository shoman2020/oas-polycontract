package contract

import (
	"context"
	"encoding/json"
	"os"
	"testing"

	"github.com/getkin/kin-openapi/openapi3"
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
	client, err := NewProductAPIClient(os.Getenv("API_BASE_URL"))
	if err != nil {
		t.Fatal(err)
	}
	response, err := client.GetProduct(ctx, "demo-sku")
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()
	body, err := validateOpenAPIResponse(ctx, spec, response)
	if err != nil {
		t.Fatalf("response does not match OAS: %v", err)
	}
	var product struct {
		SKU       string `json:"sku"`
		Available int    `json:"available"`
	}
	if err := json.Unmarshal(body, &product); err != nil {
		t.Fatal(err)
	}
	if product.SKU != "demo-sku" || product.Available != 7 {
		t.Fatalf("unexpected product response: %+v", product)
	}

	t.Logf("OAS validation passed: GET /products/demo-sku -> %d", response.StatusCode)
}

