package contract

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"testing"

	"github.com/getkin/kin-openapi/openapi3"
)

func TestStatefulOrderLifecycleMatchesOpenAPIContract(t *testing.T) {
	ctx := context.Background()
	loader := openapi3.NewLoader()
	spec, err := loader.LoadFromFile(os.Getenv("STATEFUL_OPENAPI_SPEC"))
	if err != nil {
		t.Fatal(err)
	}
	if err := spec.Validate(ctx); err != nil {
		t.Fatalf("invalid stateful OpenAPI document: %v", err)
	}
	client, err := NewOrderAPIClient(os.Getenv("STATEFUL_API_BASE_URL"))
	if err != nil {
		t.Fatal(err)
	}
	validate := func(response *http.Response, expectedStatus int) []byte {
		t.Helper()
		defer response.Body.Close()
		body, err := validateOpenAPIResponse(ctx, spec, response)
		if err != nil {
			t.Fatalf("response does not match stateful OAS: %v", err)
		}
		if response.StatusCode != expectedStatus {
			t.Fatalf("expected HTTP %d, got %d: %s", expectedStatus, response.StatusCode, body)
		}
		return body
	}

	createdResponse, err := client.CreateOrder(ctx, "demo-sku", 2)
	if err != nil {
		t.Fatal(err)
	}
	createdBody := validate(createdResponse, 201)
	var order struct {
		ID     string `json:"id"`
		Status string `json:"status"`
	}
	if err := json.Unmarshal(createdBody, &order); err != nil {
		t.Fatal(err)
	}
	if order.ID == "" || order.Status != "created" {
		t.Fatalf("unexpected created order: %+v", order)
	}

	getResponse, err := client.GetOrder(ctx, order.ID)
	if err != nil {
		t.Fatal(err)
	}
	validate(getResponse, 200)

	updateResponse, err := client.UpdateOrder(ctx, order.ID, "confirmed")
	if err != nil {
		t.Fatal(err)
	}
	updatedBody := validate(updateResponse, 200)
	var updated struct {
		Status string `json:"status"`
	}
	if err := json.Unmarshal(updatedBody, &updated); err != nil {
		t.Fatal(err)
	}
	if updated.Status != "confirmed" {
		t.Fatalf("expected confirmed order, got %q", updated.Status)
	}

	deleteResponse, err := client.DeleteOrder(ctx, order.ID)
	if err != nil {
		t.Fatal(err)
	}
	validate(deleteResponse, 204)

	missingResponse, err := client.GetOrder(ctx, order.ID)
	if err != nil {
		t.Fatal(err)
	}
	missingBody := validate(missingResponse, 404)
	var missing struct {
		Message string `json:"message"`
	}
	if err := json.Unmarshal(missingBody, &missing); err != nil {
		t.Fatal(err)
	}
	if missing.Message != "Order not found" {
		t.Fatalf("unexpected not-found response: %+v", missing)
	}
	t.Log("Stateful OAS validation passed: create -> read -> confirm -> delete -> 404")
}
