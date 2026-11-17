package contract

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type OrderAPIClient struct {
	baseURL string
	http    *http.Client
}

func NewOrderAPIClient(baseURL string) (*OrderAPIClient, error) {
	parsedURL, err := url.ParseRequestURI(baseURL)
	if err != nil || parsedURL.Scheme == "" || parsedURL.Host == "" {
		return nil, fmt.Errorf("stateful API base URL must be absolute: %q", baseURL)
	}
	return &OrderAPIClient{
		baseURL: strings.TrimRight(baseURL, "/"),
		http:    &http.Client{Timeout: 10 * time.Second},
	}, nil
}

func (client *OrderAPIClient) CreateOrder(ctx context.Context, sku string, quantity int) (*http.Response, error) {
	return client.sendJSON(ctx, http.MethodPost, "/orders", map[string]any{
		"sku": sku, "quantity": quantity,
	})
}

func (client *OrderAPIClient) GetOrder(ctx context.Context, orderID string) (*http.Response, error) {
	return client.send(ctx, http.MethodGet, "/orders/"+url.PathEscape(orderID), nil)
}

func (client *OrderAPIClient) UpdateOrder(ctx context.Context, orderID, status string) (*http.Response, error) {
	return client.sendJSON(ctx, http.MethodPatch, "/orders/"+url.PathEscape(orderID), map[string]string{
		"status": status,
	})
}

func (client *OrderAPIClient) DeleteOrder(ctx context.Context, orderID string) (*http.Response, error) {
	return client.send(ctx, http.MethodDelete, "/orders/"+url.PathEscape(orderID), nil)
}

func (client *OrderAPIClient) sendJSON(ctx context.Context, method, path string, payload any) (*http.Response, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("encode %s request: %w", method, err)
	}
	request, err := http.NewRequestWithContext(ctx, method, client.baseURL+path, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create %s request: %w", method, err)
	}
	request.Header.Set("Content-Type", "application/json")
	return client.http.Do(request)
}

func (client *OrderAPIClient) send(ctx context.Context, method, path string, body io.Reader) (*http.Response, error) {
	request, err := http.NewRequestWithContext(ctx, method, client.baseURL+path, body)
	if err != nil {
		return nil, fmt.Errorf("create %s request: %w", method, err)
	}
	return client.http.Do(request)
}
