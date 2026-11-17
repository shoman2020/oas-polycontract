using System.Text.Json;
using Xunit;

namespace OasPolycontract.Clients.CSharp;

public sealed class ProductApiIntegrationTests
{
    [Fact]
    public async Task ProductResponseMatchesOpenApiContract()
    {
        using var httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
        var api = new ProductApiClient(httpClient, new Uri(RequiredEnvironmentVariable("API_BASE_URL")));
        var contract = OpenApiResponseValidator.Load(RequiredEnvironmentVariable("OPENAPI_SPEC"));
        var cancellationToken = TestContext.Current.CancellationToken;

        using var response = await api.GetProductAsync("demo-sku", cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        await contract.ValidateAsync(response, body, "/products/{sku}", "get");

        using var parsed = JsonDocument.Parse(body);
        Assert.Equal("demo-sku", parsed.RootElement.GetProperty("sku").GetString());
        Assert.Equal(7, parsed.RootElement.GetProperty("available").GetInt32());
        Console.WriteLine($"OAS validation passed: GET /products/demo-sku -> {(int)response.StatusCode}");
    }

    private static string RequiredEnvironmentVariable(string name) =>
        Environment.GetEnvironmentVariable(name)
        ?? throw new InvalidOperationException($"{name} is required");
}

