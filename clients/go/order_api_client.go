package contract

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
)

type OrderAPIClient struct{ apiClient }

var _ StatefulOrderAPI = (*OrderAPIClient)(nil)

func NewOrderAPIClient(baseURL string) (*OrderAPIClient, error) {
	client, err := newAPIClient(baseURL, nil)
	if err != nil {
		return nil, fmt.Errorf("stateful API client: %w", err)
	}
	return &OrderAPIClient{apiClient: *client}, nil
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
