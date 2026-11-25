namespace OasPolycontract.Clients.CSharp;

internal sealed class ProductApiClient : HttpApiClient, IProductApiClient
{
    public ProductApiClient(HttpClient httpClient, Uri baseUri)
        : base(httpClient, baseUri)
    {
    }

    public Task<HttpResponseMessage> GetProductAsync(string sku, CancellationToken cancellationToken = default) =>
        GetAsync($"/products/{Uri.EscapeDataString(sku)}", cancellationToken);

    public Task<HttpResponseMessage> GetProductPathAsync(string path, CancellationToken cancellationToken = default) =>
        GetAsync(path, cancellationToken);
}

