package contract

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type ProductAPIClient struct {
	baseURL string
	http    *http.Client
}

func NewProductAPIClient(baseURL string) (*ProductAPIClient, error) {
	parsedURL, err := url.ParseRequestURI(baseURL)
	if err != nil || parsedURL.Scheme == "" || parsedURL.Host == "" {
		return nil, fmt.Errorf("API base URL must be absolute: %q", baseURL)
	}
	return &ProductAPIClient{
		baseURL: strings.TrimRight(baseURL, "/"),
		http:    &http.Client{Timeout: 10 * time.Second},
	}, nil
}

func (client *ProductAPIClient) GetProduct(ctx context.Context, sku string) (*http.Response, error) {
	endpoint := fmt.Sprintf("%s/products/%s", client.baseURL, url.PathEscape(sku))
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("create product request: %w", err)
	}
	response, err := client.http.Do(request)
	if err != nil {
		return nil, fmt.Errorf("get product %q: %w", sku, err)
	}
	return response, nil
}

