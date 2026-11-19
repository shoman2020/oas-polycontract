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
	scenario := acceptanceCase(t, "order.confirm")
	sku, ok := scenario["sku"].(string)
	if !ok {
		t.Fatal("feature data has no order SKU")
	}
	quantity := int(scenario["quantity"].(float64))
	targetStatus, ok := scenario["status"].(string)
	if !ok {
		t.Fatal("feature data has no target status")
	}
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
	var api StatefulOrderAPI = client
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

	createdResponse, err := api.CreateOrder(ctx, sku, quantity)
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

	getResponse, err := api.GetOrder(ctx, order.ID)
	if err != nil {
		t.Fatal(err)
	}
	validate(getResponse, 200)

	for range int(scenario["repeatCount"].(float64)) {
		updateResponse, err := api.UpdateOrder(ctx, order.ID, targetStatus)
		if err != nil {
			t.Fatal(err)
		}
		updatedBody := validate(updateResponse, int(scenario["expectedStatus"].(float64)))
		var updated struct {
			Status string `json:"status"`
		}
		if err := json.Unmarshal(updatedBody, &updated); err != nil {
			t.Fatal(err)
		}
		if updated.Status != targetStatus {
			t.Fatalf("expected %s order, got %q", targetStatus, updated.Status)
		}
	}

	deleteResponse, err := api.DeleteOrder(ctx, order.ID)
	if err != nil {
		t.Fatal(err)
	}
	validate(deleteResponse, 204)

	missingResponse, err := api.GetOrder(ctx, order.ID)
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

func TestOrderAcceptanceErrorScenariosMatchOpenAPIContract(t *testing.T) {
	ctx := context.Background()
	spec, err := openapi3.NewLoader().LoadFromFile(os.Getenv("STATEFUL_OPENAPI_SPEC"))
	if err != nil {
		t.Fatal(err)
	}
	if err := spec.Validate(ctx); err != nil {
		t.Fatalf("invalid stateful OpenAPI document: %v", err)
	}
	baseURL := os.Getenv("STATEFUL_API_BASE_URL")
	client, err := NewOrderAPIClient(baseURL)
	if err != nil {
		t.Fatal(err)
	}
	var api StatefulOrderAPI = client
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

	invalid := acceptanceCase(t, "order.invalid")
	response, err := client.CreateOrder(ctx, invalid["sku"].(string), int(invalid["quantity"].(float64)))
	if err != nil {
		t.Fatal(err)
	}
	validate(response, int(invalid["expectedStatus"].(float64)))

	scenario := acceptanceCase(t, "order.illegal-transition")
	response, err = client.CreateOrder(ctx, scenario["sku"].(string), int(scenario["quantity"].(float64)))
	if err != nil {
		t.Fatal(err)
	}
	createdBody := validate(response, 201)
	var created struct{ ID string `json:"id"` }
	if err := json.Unmarshal(createdBody, &created); err != nil {
		t.Fatal(err)
	}
	for range int(scenario["repeatCount"].(float64)) {
		response, err = client.UpdateOrder(ctx, created.ID, scenario["initialStatus"].(string))
		if err != nil {
			t.Fatal(err)
		}
		body := validate(response, 200)
		var order map[string]any
		if err := json.Unmarshal(body, &order); err != nil || order["status"] != scenario["persistedStatus"] {
			t.Fatalf("repeated status update was not idempotent: %s", body)
		}
	}
	response, err = client.UpdateOrder(ctx, created.ID, scenario["requestedStatus"].(string))
	if err != nil {
		t.Fatal(err)
	}
	conflictBody := validate(response, int(scenario["expectedStatus"].(float64)))
	response, err = client.GetOrder(ctx, created.ID)
	if err != nil {
		t.Fatal(err)
	}
	unchangedBody := validate(response, 200)
	var unchanged map[string]any
	if err := json.Unmarshal(unchangedBody, &unchanged); err != nil || unchanged["status"] != scenario["persistedStatus"] {
		t.Fatalf("conflict changed persisted order state: %s (conflict %s)", unchangedBody, conflictBody)
	}
	response, err = client.DeleteOrder(ctx, created.ID)
	if err != nil {
		t.Fatal(err)
	}
	validate(response, 204)

	unsupported := acceptanceCase(t, "order.unsupported-method")
	request, err := http.NewRequestWithContext(ctx, unsupported["method"].(string), baseURL+unsupported["path"].(string), nil)
	if err != nil {
		t.Fatal(err)
	}
	response, err = http.DefaultClient.Do(request)
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()
	if response.StatusCode != int(unsupported["expectedStatus"].(float64)) || response.Header.Get("Allow") != unsupported["allowedMethod"] {
		t.Fatalf("unexpected unsupported-method response: status=%d Allow=%q", response.StatusCode, response.Header.Get("Allow"))
	}
}
