package contract

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"testing"

	"github.com/getkin/kin-openapi/openapi3"
)

func TestProductResponseMatchesOpenAPIContract(t *testing.T) {
	scenario := acceptanceCase(t, "product.available")
	sku, ok := scenario["sku"].(string)
	if !ok {
		t.Fatal("feature data has no product SKU")
	}
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
	var api ProductAPI = client
	response, err := api.GetProduct(ctx, sku)
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
	if product.SKU != sku || product.Available != int(scenario["available"].(float64)) {
		t.Fatalf("unexpected product response: %+v", product)
	}

	t.Logf("OAS validation passed: GET /products/%s -> %d", sku, response.StatusCode)
}

func TestProductAcceptanceErrorScenariosMatchOpenAPIContract(t *testing.T) {
	ctx := context.Background()
	spec, err := openapi3.NewLoader().LoadFromFile(os.Getenv("OPENAPI_SPEC"))
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
	var api ProductAPI = client

	for _, caseID := range []string{"product.not-found", "product.bad-upstream", "product.malformed-path"} {
		t.Run(caseID, func(t *testing.T) {
			scenario := acceptanceCase(t, caseID)
			var response *http.Response
			var err error
			if rawPath, ok := scenario["path"].(string); ok {
				response, err = api.GetProductPath(ctx, rawPath)
			} else {
				response, err = api.GetProduct(ctx, scenario["sku"].(string))
			}
			if err != nil {
				t.Fatal(err)
			}
			defer response.Body.Close()
			body, err := validateOpenAPIResponse(ctx, spec, response)
			if err != nil {
				t.Fatalf("response does not match OAS: %v", err)
			}
			if response.StatusCode != int(scenario["expectedStatus"].(float64)) {
				t.Fatalf("expected HTTP %v, got %d: %s", scenario["expectedStatus"], response.StatusCode, body)
			}
			var actual map[string]any
			if err := json.Unmarshal(body, &actual); err != nil {
				t.Fatal(err)
			}
			if actual["message"] != scenario["expectedMessage"] {
				t.Fatalf("unexpected error response for %s: %#v", caseID, actual)
			}
		})
	}
}

