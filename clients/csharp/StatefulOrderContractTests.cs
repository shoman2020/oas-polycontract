using System.Text.Json;
using Xunit;

namespace OasPolycontract.Clients.CSharp;

public sealed class StatefulOrderContractTests
{
    [Fact]
    public async Task OrderLifecycleResponsesMatchOpenApiContract()
    {
        using var httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
        var api = new StatefulOrderApiClient(httpClient, new Uri(RequiredEnvironmentVariable("STATEFUL_API_BASE_URL")));
        var contract = OpenApiResponseValidator.Load(RequiredEnvironmentVariable("STATEFUL_OPENAPI_SPEC"));
        var cancellationToken = TestContext.Current.CancellationToken;

        using var createdResponse = await api.CreateOrderAsync("demo-sku", 2, cancellationToken);
        var createdBody = await createdResponse.Content.ReadAsStringAsync();
        await contract.ValidateAsync(createdResponse, createdBody, "/orders", "post");
        Assert.Equal(201, (int)createdResponse.StatusCode);
        using var created = JsonDocument.Parse(createdBody);
        var orderId = created.RootElement.GetProperty("id").GetString()
            ?? throw new InvalidOperationException("Created order has no id");
        Assert.Equal("created", created.RootElement.GetProperty("status").GetString());

        using var fetchedResponse = await api.GetOrderAsync(orderId, cancellationToken);
        var fetchedBody = await fetchedResponse.Content.ReadAsStringAsync();
        await contract.ValidateAsync(fetchedResponse, fetchedBody, "/orders/{orderId}", "get");
        Assert.Equal(200, (int)fetchedResponse.StatusCode);
        using (var fetched = JsonDocument.Parse(fetchedBody))
            Assert.Equal(orderId, fetched.RootElement.GetProperty("id").GetString());

        using var updatedResponse = await api.UpdateOrderAsync(orderId, "confirmed", cancellationToken);
        var updatedBody = await updatedResponse.Content.ReadAsStringAsync();
        await contract.ValidateAsync(updatedResponse, updatedBody, "/orders/{orderId}", "patch");
        Assert.Equal(200, (int)updatedResponse.StatusCode);
        using (var updated = JsonDocument.Parse(updatedBody))
            Assert.Equal("confirmed", updated.RootElement.GetProperty("status").GetString());

        using var deletedResponse = await api.DeleteOrderAsync(orderId, cancellationToken);
        var deletedBody = await deletedResponse.Content.ReadAsStringAsync();
        await contract.ValidateAsync(deletedResponse, deletedBody, "/orders/{orderId}", "delete");
        Assert.Equal(204, (int)deletedResponse.StatusCode);
        Assert.Empty(deletedBody);

        using var missingResponse = await api.GetOrderAsync(orderId, cancellationToken);
        var missingBody = await missingResponse.Content.ReadAsStringAsync();
        await contract.ValidateAsync(missingResponse, missingBody, "/orders/{orderId}", "get");
        Assert.Equal(404, (int)missingResponse.StatusCode);
        using var missing = JsonDocument.Parse(missingBody);
        Assert.Equal("Order not found", missing.RootElement.GetProperty("message").GetString());
        Console.WriteLine("Stateful OAS validation passed: create -> read -> confirm -> delete -> 404");
    }

    private static string RequiredEnvironmentVariable(string name) =>
        Environment.GetEnvironmentVariable(name)
        ?? throw new InvalidOperationException($"{name} is required");
}
