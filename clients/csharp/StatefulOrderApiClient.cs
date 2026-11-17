using System.Net.Http.Json;

namespace OasPolycontract.Clients.CSharp;

internal sealed class StatefulOrderApiClient
{
    private readonly HttpClient _httpClient;
    private readonly Uri _baseUri;

    public StatefulOrderApiClient(HttpClient httpClient, Uri baseUri)
    {
        _httpClient = httpClient ?? throw new ArgumentNullException(nameof(httpClient));
        _baseUri = baseUri ?? throw new ArgumentNullException(nameof(baseUri));
    }

    public Task<HttpResponseMessage> CreateOrderAsync(string sku, int quantity, CancellationToken cancellationToken = default) =>
        _httpClient.PostAsJsonAsync(new Uri(_baseUri, "/orders"), new { sku, quantity }, cancellationToken);

    public Task<HttpResponseMessage> GetOrderAsync(string orderId, CancellationToken cancellationToken = default) =>
        _httpClient.GetAsync(OrderUri(orderId), cancellationToken);

    public Task<HttpResponseMessage> UpdateOrderAsync(string orderId, string status, CancellationToken cancellationToken = default) =>
        _httpClient.PatchAsJsonAsync(OrderUri(orderId), new { status }, cancellationToken);

    public Task<HttpResponseMessage> DeleteOrderAsync(string orderId, CancellationToken cancellationToken = default) =>
        _httpClient.DeleteAsync(OrderUri(orderId), cancellationToken);

    private Uri OrderUri(string orderId) => new(_baseUri, $"/orders/{Uri.EscapeDataString(orderId)}");
}
