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
        var responses = NodeAt(_spec, "paths", operationPath, method, "responses") as YamlMappingNode
            ?? throw new InvalidOperationException($"Responses for {method.ToUpperInvariant()} {operationPath} must be a mapping");
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
            const string componentSchemaPrefix = "#/components/schemas/";
            if (!referencePath.StartsWith(componentSchemaPrefix, StringComparison.Ordinal))
                throw new InvalidOperationException("Only local OpenAPI component schema references are supported by this demo");
            var schemaSegments = new[] { "components", "schemas" }
                .Concat(referencePath[componentSchemaPrefix.Length..]
                    .Split('/').Select(UnescapePointerSegment))
                .ToArray();
            schemaNode = NodeAt(_spec, schemaSegments);
        }

        var schemaJson = ToJsonNode(schemaNode) as JsonObject
            ?? throw new InvalidOperationException("OpenAPI JSON response schema must be an object");
        schemaJson["$defs"] = TryNodeAt(_spec, out var componentSchemas, "components", "schemas")
            ? ToJsonNode(componentSchemas)
            : new JsonObject();
        schemaJson["$schema"] = "https://json-schema.org/draft/2020-12/schema";
        NormalizeSchema(schemaJson);
        EnsureLocalSchemaReferences(schemaJson);
        var schema = await JsonSchema.FromJsonAsync(schemaJson.ToJsonString());
        var errors = schema.Validate(body);
        if (errors.Count != 0)
            throw new InvalidOperationException(string.Join(Environment.NewLine, errors));
    }

    private static bool TryNodeAt(YamlNode root, out YamlNode node, params string[] segments)
    {
        var current = root;
        foreach (var segment in segments)
        {
            if (current is not YamlMappingNode mapping || !mapping.Children.TryGetValue(new YamlScalarNode(segment), out current!))
            {
                node = default!;
                return false;
            }
        }
        node = current;
        return true;
    }

    private static YamlNode NodeAt(YamlNode root, params string[] segments)
    {
        var current = root;
        foreach (var segment in segments)
            current = ((YamlMappingNode)current)[new YamlScalarNode(segment)];
        return current;
    }

    private static string UnescapePointerSegment(string segment) => segment.Replace("~1", "/").Replace("~0", "~");

    private static void EnsureLocalSchemaReferences(JsonNode? node)
    {
        if (node is JsonArray array)
        {
            foreach (var item in array) EnsureLocalSchemaReferences(item);
            return;
        }

        if (node is not JsonObject schema) return;
        if (schema.TryGetPropertyValue("$ref", out var referenceNode))
        {
            const string definitionsPrefix = "#/$defs/";
            if (referenceNode is not JsonValue referenceValue
                || !referenceValue.TryGetValue<string>(out var reference)
                || !reference.StartsWith(definitionsPrefix, StringComparison.Ordinal))
            {
                throw new InvalidOperationException("Only local OpenAPI component schema references are supported by this demo");
            }
        }

        foreach (var value in schema.ToArray()) EnsureLocalSchemaReferences(value.Value);
    }

    private static void NormalizeExclusiveBound(JsonObject schema, string exclusiveKey, string boundKey)
    {
        if (schema[exclusiveKey] is JsonValue exclusiveNode
            && exclusiveNode.TryGetValue<bool>(out var exclusive))
        {
            if (exclusive && schema[boundKey] is JsonNode bound)
            {
                schema[exclusiveKey] = bound.DeepClone();
                schema.Remove(boundKey);
            }
            else if (!exclusive)
            {
                schema.Remove(exclusiveKey);
            }
        }
    }

    private static void NormalizeSchema(JsonNode? node)
    {
        if (node is JsonArray array)
        {
            foreach (var item in array) NormalizeSchema(item);
            return;
        }

        if (node is not JsonObject schema) return;

        var nullable = schema["nullable"] is JsonValue nullableValue
            && nullableValue.TryGetValue<bool>(out var isNullable)
            && isNullable;
        schema.Remove("nullable");

        NormalizeExclusiveBound(schema, "exclusiveMinimum", "minimum");
        NormalizeExclusiveBound(schema, "exclusiveMaximum", "maximum");

        if (schema["$ref"] is JsonValue referenceNode
            && referenceNode.TryGetValue<string>(out var reference)
            && reference.StartsWith("#/components/schemas/", StringComparison.Ordinal))
        {
            schema["$ref"] = "#/$defs/" + reference["#/components/schemas/".Length..];
        }

        foreach (var value in schema.ToArray()) NormalizeSchema(value.Value);

        if (nullable)
        {
            if (schema["type"] is JsonValue typeNode
                && typeNode.TryGetValue<string>(out var typeName))
            {
                schema["type"] = new JsonArray(JsonValue.Create(typeName), JsonValue.Create("null"));
            }
            else
            {
                var nonNullSchema = (JsonObject)schema.DeepClone();
                schema.Clear();
                schema["anyOf"] = new JsonArray(nonNullSchema, new JsonObject { ["type"] = "null" });
            }
        }
    }

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

