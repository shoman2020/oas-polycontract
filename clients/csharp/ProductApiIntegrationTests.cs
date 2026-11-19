using System.Text.Json;
using Xunit;

namespace OasPolycontract.Clients.CSharp;

public sealed class ProductApiIntegrationTests
{
    [Fact]
    public async Task ProductResponseMatchesOpenApiContract()
    {
        var scenario = FeatureCases.ById("product.available");
        using var httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
        IProductApiClient api = new ProductApiClient(httpClient, new Uri(RequiredEnvironmentVariable("API_BASE_URL")));
        var contract = OpenApiResponseValidator.Load(RequiredEnvironmentVariable("OPENAPI_SPEC"));
        var cancellationToken = TestContext.Current.CancellationToken;

        var sku = scenario.GetProperty("sku").GetString()!;
        using var response = await api.GetProductAsync(sku, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        await contract.ValidateAsync(response, body, "/products/{sku}", "get");

        using var parsed = JsonDocument.Parse(body);
        Assert.Equal(scenario.GetProperty("expectedStatus").GetInt32(), (int)response.StatusCode);
        Assert.Equal(sku, parsed.RootElement.GetProperty("sku").GetString());
        Assert.Equal(scenario.GetProperty("available").GetInt32(), parsed.RootElement.GetProperty("available").GetInt32());
        Console.WriteLine($"OAS validation passed: GET /products/demo-sku -> {(int)response.StatusCode}");
    }

    [Fact]
    public async Task ProductErrorFeaturesMatchOpenApiContract()
    {
        using var httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
        var baseUri = new Uri(RequiredEnvironmentVariable("API_BASE_URL"));
        IProductApiClient api = new ProductApiClient(httpClient, baseUri);
        var contract = OpenApiResponseValidator.Load(RequiredEnvironmentVariable("OPENAPI_SPEC"));
        var cancellationToken = TestContext.Current.CancellationToken;

        foreach (var caseId in new[] { "product.not-found", "product.bad-upstream", "product.malformed-path" })
        {
            var scenario = FeatureCases.ById(caseId);
            using var response = scenario.TryGetProperty("path", out var path)
                ? await api.GetProductPathAsync(path.GetString()!, cancellationToken)
                : await api.GetProductAsync(scenario.GetProperty("sku").GetString()!, cancellationToken);
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            await contract.ValidateAsync(response, body, "/products/{sku}", "get");
            Assert.Equal(scenario.GetProperty("expectedStatus").GetInt32(), (int)response.StatusCode);
            using var parsed = JsonDocument.Parse(body);
            Assert.Equal(scenario.GetProperty("expectedMessage").GetString(), parsed.RootElement.GetProperty("message").GetString());
        }
    }

    private static string RequiredEnvironmentVariable(string name) =>
        Environment.GetEnvironmentVariable(name)
        ?? throw new InvalidOperationException($"{name} is required");
}

