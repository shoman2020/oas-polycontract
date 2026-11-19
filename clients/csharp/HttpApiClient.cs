using System.Net.Http.Json;

namespace OasPolycontract.Clients.CSharp;

internal interface IApiClient
{
    Uri BaseUri { get; }
}

internal interface IProductApiClient : IApiClient
{
    Task<HttpResponseMessage> GetProductAsync(string sku, CancellationToken cancellationToken = default);
    Task<HttpResponseMessage> GetProductPathAsync(string path, CancellationToken cancellationToken = default);
}

internal interface IStatefulOrderApiClient : IApiClient
{
    Task<HttpResponseMessage> CreateOrderAsync(string sku, int quantity, CancellationToken cancellationToken = default);
    Task<HttpResponseMessage> GetOrderAsync(string orderId, CancellationToken cancellationToken = default);
    Task<HttpResponseMessage> UpdateOrderAsync(string orderId, string status, CancellationToken cancellationToken = default);
    Task<HttpResponseMessage> DeleteOrderAsync(string orderId, CancellationToken cancellationToken = default);
}

internal abstract class HttpApiClient : IApiClient
{
    protected HttpApiClient(HttpClient httpClient, Uri baseUri)
    {
        Client = httpClient ?? throw new ArgumentNullException(nameof(httpClient));
        BaseUri = baseUri ?? throw new ArgumentNullException(nameof(baseUri));
        if (!BaseUri.IsAbsoluteUri || BaseUri.Scheme is not ("http" or "https"))
            throw new ArgumentException("Base URI must be absolute HTTP or HTTPS", nameof(baseUri));
    }

    protected HttpClient Client { get; }

    public Uri BaseUri { get; }

    protected Task<HttpResponseMessage> GetAsync(string path, CancellationToken cancellationToken) =>
        Client.GetAsync(new Uri(BaseUri, path), cancellationToken);

    protected Task<HttpResponseMessage> DeleteAsync(string path, CancellationToken cancellationToken) =>
        Client.DeleteAsync(new Uri(BaseUri, path), cancellationToken);

    protected async Task<HttpResponseMessage> SendJsonAsync(
        HttpMethod method,
        string path,
        object payload,
        CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(method, new Uri(BaseUri, path))
        {
            Content = JsonContent.Create(payload),
        };
        return await Client.SendAsync(request, cancellationToken);
    }
}
