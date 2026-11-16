using System.Net.Http;
using System.Text.Json;
using System.Text.Json.Nodes;
using NJsonSchema;
using Xunit;
using YamlDotNet.RepresentationModel;

namespace OasPolycontract.Clients.CSharp;

public sealed class ProductContractTests
{
    [Fact]
    public async Task ProductResponseMatchesOpenApiContract()
    {
        using var client = new HttpClient();
        using var response = await client.GetAsync($"{Environment.GetEnvironmentVariable("API_BASE_URL")}/products/demo-sku");
        var status = (int)response.StatusCode;
        Assert.Equal("application/json", response.Content.Headers.ContentType?.MediaType);

        var spec = LoadYaml(Environment.GetEnvironmentVariable("OPENAPI_SPEC")!);
        var responses = NodeAt(spec, "paths", "/products/{sku}", "get", "responses");
        var responseKey = status.ToString(System.Globalization.CultureInfo.InvariantCulture);
        var hasStatus = responses.Children.Keys
            .OfType<YamlScalarNode>()
            .Any(key => key.Value == responseKey);
        Assert.True(hasStatus, $"HTTP {status} is not declared in the OAS response map");

        var schemaNode = NodeAt(spec, "paths", "/products/{sku}", "get", "responses", responseKey, "content", "application/json", "schema");
        if (schemaNode is YamlMappingNode schemaMap && schemaMap.Children.TryGetValue(new YamlScalarNode("$ref"), out var reference))
        {
            var referencePath = ((YamlScalarNode)reference).Value!;
            Assert.StartsWith("#/", referencePath);
            schemaNode = NodeAt(spec, referencePath[2..].Split('/').Select(UnescapePointerSegment).ToArray());
        }

        var schemaJson = ToJsonNode(schemaNode)!.ToJsonString();
        var schema = await JsonSchema.FromJsonAsync(schemaJson);
        var body = await response.Content.ReadAsStringAsync();
        var errors = schema.Validate(body);
        Assert.Empty(errors);

        using var parsed = JsonDocument.Parse(body);
        Assert.Equal("demo-sku", parsed.RootElement.GetProperty("sku").GetString());
        Assert.Equal(7, parsed.RootElement.GetProperty("available").GetInt32());
        Console.WriteLine($"OAS validation passed: GET /products/demo-sku -> {status}");
    }

    private static YamlMappingNode LoadYaml(string path)
    {
        using var reader = File.OpenText(path);
        var yaml = new YamlStream();
        yaml.Load(reader);
        return (YamlMappingNode)yaml.Documents[0].RootNode;
    }

    private static YamlNode NodeAt(YamlNode root, params string[] segments)
    {
        var current = root;
        foreach (var segment in segments)
            current = ((YamlMappingNode)current)[new YamlScalarNode(segment)];
        return current;
    }

    private static string UnescapePointerSegment(string segment) => segment.Replace("~1", "/").Replace("~0", "~");

    private static JsonNode? ToJsonNode(YamlNode node) => node switch
    {
        YamlMappingNode mapping => new JsonObject(mapping.Children.ToDictionary(
            pair => ((YamlScalarNode)pair.Key).Value!, pair => ToJsonNode(pair.Value))),
        YamlSequenceNode sequence => new JsonArray(sequence.Children.Select(ToJsonNode).ToArray()),
        YamlScalarNode scalar => ScalarToJson(scalar),
        _ => throw new InvalidOperationException($"Unsupported YAML node: {node.GetType().Name}")
    };

    private static JsonNode? ScalarToJson(YamlScalarNode scalar)
    {
        var value = scalar.Value ?? "";
        if (scalar.Style != YamlDotNet.Core.ScalarStyle.Plain)
            return JsonValue.Create(value);
        if (value is "null" or "Null" or "NULL" or "~") return null;
        if (bool.TryParse(value, out var boolean)) return JsonValue.Create(boolean);
        if (long.TryParse(value, System.Globalization.NumberStyles.Integer, System.Globalization.CultureInfo.InvariantCulture, out var integer)) return JsonValue.Create(integer);
        if (double.TryParse(value, System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var number)) return JsonValue.Create(number);
        return JsonValue.Create(value);
    }
}
