namespace OasPolycontract.Clients.CSharp;

internal sealed class StatefulOrderApiClient : HttpApiClient, IStatefulOrderApiClient
{
    public StatefulOrderApiClient(HttpClient httpClient, Uri baseUri)
        : base(httpClient, baseUri)
    {
    }

    public Task<HttpResponseMessage> CreateOrderAsync(string sku, int quantity, CancellationToken cancellationToken = default) =>
        SendJsonAsync(HttpMethod.Post, "/orders", new { sku, quantity }, cancellationToken);

    public Task<HttpResponseMessage> GetOrderAsync(string orderId, CancellationToken cancellationToken = default) =>
        GetAsync(OrderPath(orderId), cancellationToken);

    public Task<HttpResponseMessage> UpdateOrderAsync(string orderId, string status, CancellationToken cancellationToken = default) =>
        SendJsonAsync(HttpMethod.Patch, OrderPath(orderId), new { status }, cancellationToken);

    public Task<HttpResponseMessage> DeleteOrderAsync(string orderId, CancellationToken cancellationToken = default) =>
        DeleteAsync(OrderPath(orderId), cancellationToken);

    private static string OrderPath(string orderId) => $"/orders/{Uri.EscapeDataString(orderId)}";
}
