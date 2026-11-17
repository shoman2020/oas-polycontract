using System.Globalization;
using System.Text.Json.Nodes;
using NJsonSchema;
using YamlDotNet.RepresentationModel;

namespace OasPolycontract.Clients.CSharp;

internal sealed class OpenApiResponseValidator
{
    private readonly YamlMappingNode _spec;

    private OpenApiResponseValidator(YamlMappingNode spec) => _spec = spec;

    public static OpenApiResponseValidator Load(string path)
    {
        using var reader = File.OpenText(path);
        var yaml = new YamlStream();
        yaml.Load(reader);
        return new OpenApiResponseValidator((YamlMappingNode)yaml.Documents[0].RootNode);
    }

    public async Task ValidateAsync(
        HttpResponseMessage response,
        string body,
        string operationPath,
        string method)
    {
        var status = ((int)response.StatusCode).ToString(CultureInfo.InvariantCulture);
        var responses = NodeAt(_spec, "paths", operationPath, method, "responses");
        var responseExists = responses.Children.Keys
            .OfType<YamlScalarNode>()
            .Any(key => key.Value == status);
        if (!responseExists)
            throw new InvalidOperationException($"HTTP {status} is not declared for {method.ToUpperInvariant()} {operationPath}");

        var responseNode = NodeAt(_spec, "paths", operationPath, method, "responses", status);
        if (responseNode is not YamlMappingNode responseMap
            || !responseMap.Children.TryGetValue(new YamlScalarNode("content"), out var contentNode))
        {
            if (!string.IsNullOrEmpty(body))
                throw new InvalidOperationException($"HTTP {status} for {method.ToUpperInvariant()} {operationPath} must not have a body");
            return;
        }

        if (!string.Equals(response.Content.Headers.ContentType?.MediaType, "application/json", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Response content type must be application/json");
        var schemaNode = NodeAt(contentNode, "application/json", "schema");
        if (schemaNode is YamlMappingNode schemaMap
            && schemaMap.Children.TryGetValue(new YamlScalarNode("$ref"), out var reference))
        {
            var referencePath = ((YamlScalarNode)reference).Value
                ?? throw new InvalidOperationException("Schema reference cannot be empty");
            if (!referencePath.StartsWith("#", StringComparison.Ordinal))
                throw new InvalidOperationException("Only local OpenAPI schema references are supported by this demo");
            schemaNode = NodeAt(_spec, referencePath[2..].Split('/').Select(UnescapePointerSegment).ToArray());
        }

        var schema = await JsonSchema.FromJsonAsync(ToJsonNode(schemaNode)!.ToJsonString());
        var errors = schema.Validate(body);
        if (errors.Count != 0)
            throw new InvalidOperationException(string.Join(Environment.NewLine, errors));
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
        if (long.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var integer)) return JsonValue.Create(integer);
        if (double.TryParse(value, NumberStyles.Float, CultureInfo.InvariantCulture, out var number)) return JsonValue.Create(number);
        return JsonValue.Create(value);
    }
}

