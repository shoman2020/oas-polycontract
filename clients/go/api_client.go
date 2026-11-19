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

type HTTPDoer interface {
	Do(*http.Request) (*http.Response, error)
}

type ProductAPI interface {
	GetProduct(context.Context, string) (*http.Response, error)
}

type StatefulOrderAPI interface {
	CreateOrder(context.Context, string, int) (*http.Response, error)
	GetOrder(context.Context, string) (*http.Response, error)
	UpdateOrder(context.Context, string, string) (*http.Response, error)
	DeleteOrder(context.Context, string) (*http.Response, error)
}

type apiClient struct {
	baseURL string
	http    HTTPDoer
}

func newAPIClient(baseURL string, client HTTPDoer) (*apiClient, error) {
	parsedURL, err := url.ParseRequestURI(baseURL)
	if err != nil || parsedURL.Scheme == "" || parsedURL.Host == "" {
		return nil, fmt.Errorf("API base URL must be absolute: %q", baseURL)
	}
	if client == nil {
		client = &http.Client{Timeout: 10 * time.Second}
	}
	return &apiClient{
		baseURL: strings.TrimRight(baseURL, "/"),
		http:    client,
	}, nil
}

func (client *apiClient) send(ctx context.Context, method, path string, body io.Reader) (*http.Response, error) {
	request, err := client.newRequest(ctx, method, path, body)
	if err != nil {
		return nil, err
	}
	return client.execute(request, method, path)
}

func (client *apiClient) sendJSON(ctx context.Context, method, path string, payload any) (*http.Response, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("encode %s request: %w", method, err)
	}
	request, err := client.newRequest(ctx, method, path, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	request.Header.Set("Content-Type", "application/json")
	return client.execute(request, method, path)
}

func (client *apiClient) newRequest(ctx context.Context, method, path string, body io.Reader) (*http.Request, error) {
	request, err := http.NewRequestWithContext(ctx, method, client.baseURL+path, body)
	if err != nil {
		return nil, fmt.Errorf("create %s request: %w", method, err)
	}
	return request, nil
}

func (client *apiClient) execute(request *http.Request, method, path string) (*http.Response, error) {
	response, err := client.http.Do(request)
	if err != nil {
		return nil, fmt.Errorf("send %s request to %s: %w", method, path, err)
	}
	return response, nil
}

type ProductAPIClient struct{ apiClient }

var _ ProductAPI = (*ProductAPIClient)(nil)

func NewProductAPIClient(baseURL string) (*ProductAPIClient, error) {
	client, err := newAPIClient(baseURL, nil)
	if err != nil {
		return nil, err
	}
	return &ProductAPIClient{apiClient: *client}, nil
}

func (client *ProductAPIClient) GetProduct(ctx context.Context, sku string) (*http.Response, error) {
	return client.send(ctx, http.MethodGet, "/products/"+url.PathEscape(sku), nil)
}

