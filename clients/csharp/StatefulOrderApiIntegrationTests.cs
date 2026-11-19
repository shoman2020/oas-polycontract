using System.Text.Json;
using Xunit;

namespace OasPolycontract.Clients.CSharp;

public sealed class StatefulOrderApiIntegrationTests
{
    [Fact]
    public async Task OrderLifecycleResponsesMatchOpenApiContract()
    {
        var scenario = FeatureCases.ById("order.confirm");
        using var httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
        IStatefulOrderApiClient api = new StatefulOrderApiClient(httpClient, new Uri(RequiredEnvironmentVariable("STATEFUL_API_BASE_URL")));
        var contract = OpenApiResponseValidator.Load(RequiredEnvironmentVariable("STATEFUL_OPENAPI_SPEC"));
        var cancellationToken = TestContext.Current.CancellationToken;

        using var createdResponse = await api.CreateOrderAsync(
            scenario.GetProperty("sku").GetString()!,
            scenario.GetProperty("quantity").GetInt32(),
            cancellationToken);
        var createdBody = await createdResponse.Content.ReadAsStringAsync(cancellationToken);
        await contract.ValidateAsync(createdResponse, createdBody, "/orders", "post");
        Assert.Equal(201, (int)createdResponse.StatusCode);
        using var created = JsonDocument.Parse(createdBody);
        var orderId = created.RootElement.GetProperty("id").GetString()
            ?? throw new InvalidOperationException("Created order has no id");
        Assert.Equal("created", created.RootElement.GetProperty("status").GetString());

        using var fetchedResponse = await api.GetOrderAsync(orderId, cancellationToken);
        var fetchedBody = await fetchedResponse.Content.ReadAsStringAsync(cancellationToken);
        await contract.ValidateAsync(fetchedResponse, fetchedBody, "/orders/{orderId}", "get");
        Assert.Equal(200, (int)fetchedResponse.StatusCode);
        using (var fetched = JsonDocument.Parse(fetchedBody))
            Assert.Equal(orderId, fetched.RootElement.GetProperty("id").GetString());

        for (var attempt = 0; attempt < scenario.GetProperty("repeatCount").GetInt32(); attempt++)
        {
            using var updatedResponse = await api.UpdateOrderAsync(
                orderId,
                scenario.GetProperty("status").GetString()!,
                cancellationToken);
            var updatedBody = await updatedResponse.Content.ReadAsStringAsync(cancellationToken);
            await contract.ValidateAsync(updatedResponse, updatedBody, "/orders/{orderId}", "patch");
            Assert.Equal(scenario.GetProperty("expectedStatus").GetInt32(), (int)updatedResponse.StatusCode);
            using var updated = JsonDocument.Parse(updatedBody);
            Assert.Equal(scenario.GetProperty("status").GetString(), updated.RootElement.GetProperty("status").GetString());
        }

        using var deletedResponse = await api.DeleteOrderAsync(orderId, cancellationToken);
        var deletedBody = await deletedResponse.Content.ReadAsStringAsync(cancellationToken);
        await contract.ValidateAsync(deletedResponse, deletedBody, "/orders/{orderId}", "delete");
        Assert.Equal(204, (int)deletedResponse.StatusCode);
        Assert.Empty(deletedBody);

        using var missingResponse = await api.GetOrderAsync(orderId, cancellationToken);
        var missingBody = await missingResponse.Content.ReadAsStringAsync(cancellationToken);
        await contract.ValidateAsync(missingResponse, missingBody, "/orders/{orderId}", "get");
        Assert.Equal(404, (int)missingResponse.StatusCode);
        using var missing = JsonDocument.Parse(missingBody);
        Assert.Equal("Order not found", missing.RootElement.GetProperty("message").GetString());
        Console.WriteLine("Stateful OAS validation passed: create -> read -> confirm -> delete -> 404");
    }

    [Fact]
    public async Task OrderErrorFeaturesMatchOpenApiContract()
    {
        using var httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
        var baseUri = new Uri(RequiredEnvironmentVariable("STATEFUL_API_BASE_URL"));
        IStatefulOrderApiClient api = new StatefulOrderApiClient(httpClient, baseUri);
        var contract = OpenApiResponseValidator.Load(RequiredEnvironmentVariable("STATEFUL_OPENAPI_SPEC"));
        var cancellationToken = TestContext.Current.CancellationToken;

        var invalid = FeatureCases.ById("order.invalid");
        using (var invalidResponse = await api.CreateOrderAsync(
            invalid.GetProperty("sku").GetString()!, invalid.GetProperty("quantity").GetInt32(), cancellationToken))
        {
            var invalidBody = await invalidResponse.Content.ReadAsStringAsync(cancellationToken);
            await contract.ValidateAsync(invalidResponse, invalidBody, "/orders", "post");
            Assert.Equal(invalid.GetProperty("expectedStatus").GetInt32(), (int)invalidResponse.StatusCode);
        }

        var scenario = FeatureCases.ById("order.illegal-transition");
        using var createdResponse = await api.CreateOrderAsync(
            scenario.GetProperty("sku").GetString()!, scenario.GetProperty("quantity").GetInt32(), cancellationToken);
        var createdBody = await createdResponse.Content.ReadAsStringAsync(cancellationToken);
        await contract.ValidateAsync(createdResponse, createdBody, "/orders", "post");
        using var created = JsonDocument.Parse(createdBody);
        var orderId = created.RootElement.GetProperty("id").GetString()!;

        for (var attempt = 0; attempt < scenario.GetProperty("repeatCount").GetInt32(); attempt++)
        {
            using var cancelledResponse = await api.UpdateOrderAsync(orderId, scenario.GetProperty("initialStatus").GetString()!, cancellationToken);
            var cancelledBody = await cancelledResponse.Content.ReadAsStringAsync(cancellationToken);
            await contract.ValidateAsync(cancelledResponse, cancelledBody, "/orders/{orderId}", "patch");
            Assert.Equal(200, (int)cancelledResponse.StatusCode);
            using var cancelled = JsonDocument.Parse(cancelledBody);
            Assert.Equal(scenario.GetProperty("persistedStatus").GetString(), cancelled.RootElement.GetProperty("status").GetString());
        }

        using (var conflictResponse = await api.UpdateOrderAsync(orderId, scenario.GetProperty("requestedStatus").GetString()!, cancellationToken))
        {
            var conflictBody = await conflictResponse.Content.ReadAsStringAsync(cancellationToken);
            await contract.ValidateAsync(conflictResponse, conflictBody, "/orders/{orderId}", "patch");
            Assert.Equal(scenario.GetProperty("expectedStatus").GetInt32(), (int)conflictResponse.StatusCode);
        }

        using (var unchangedResponse = await api.GetOrderAsync(orderId, cancellationToken))
        {
            var unchangedBody = await unchangedResponse.Content.ReadAsStringAsync(cancellationToken);
            await contract.ValidateAsync(unchangedResponse, unchangedBody, "/orders/{orderId}", "get");
            using var unchanged = JsonDocument.Parse(unchangedBody);
            Assert.Equal(scenario.GetProperty("persistedStatus").GetString(), unchanged.RootElement.GetProperty("status").GetString());
        }

        using (var deletedResponse = await api.DeleteOrderAsync(orderId, cancellationToken))
        {
            var deletedBody = await deletedResponse.Content.ReadAsStringAsync(cancellationToken);
            await contract.ValidateAsync(deletedResponse, deletedBody, "/orders/{orderId}", "delete");
            Assert.Equal(204, (int)deletedResponse.StatusCode);
        }

        var unsupported = FeatureCases.ById("order.unsupported-method");
        using var unsupportedResponse = await httpClient.PostAsync(
            new Uri(baseUri, unsupported.GetProperty("path").GetString()), content: null, cancellationToken: cancellationToken);
        Assert.Equal(unsupported.GetProperty("expectedStatus").GetInt32(), (int)unsupportedResponse.StatusCode);
        Assert.Equal(
            unsupported.GetProperty("allowedMethod").GetString(),
            string.Join(", ", unsupportedResponse.Headers.GetValues("Allow")));
    }

    private static string RequiredEnvironmentVariable(string name) =>
        Environment.GetEnvironmentVariable(name)
        ?? throw new InvalidOperationException($"{name} is required");
}
