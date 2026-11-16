namespace OasPolycontract.Clients.CSharp;

internal sealed class ProductApiClient
{
    private readonly HttpClient _httpClient;
    private readonly Uri _baseUri;

    public ProductApiClient(HttpClient httpClient, Uri baseUri)
    {
        _httpClient = httpClient ?? throw new ArgumentNullException(nameof(httpClient));
        _baseUri = baseUri ?? throw new ArgumentNullException(nameof(baseUri));
    }

    public Task<HttpResponseMessage> GetProductAsync(string sku, CancellationToken cancellationToken = default)
    {
        var escapedSku = Uri.EscapeDataString(sku);
        return _httpClient.GetAsync(new Uri(_baseUri, $"/products/{escapedSku}"), cancellationToken);
    }
}

