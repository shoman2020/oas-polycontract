package contract

import (
	"context"
	"io"
	"net/http"

	"github.com/getkin/kin-openapi/openapi3"
	"github.com/getkin/kin-openapi/openapi3filter"
	"github.com/getkin/kin-openapi/routers/gorillamux"
)

func validateOpenAPIResponse(ctx context.Context, spec *openapi3.T, response *http.Response) ([]byte, error) {
	router, err := gorillamux.NewRouter(spec)
	if err != nil {
		return nil, err
	}
	request := response.Request
	route, pathParams, err := router.FindRoute(request)
	if err != nil {
		return nil, err
	}
	body, err := io.ReadAll(response.Body)
	if err != nil {
		return nil, err
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
		return body, err
	}
	return body, nil
}
