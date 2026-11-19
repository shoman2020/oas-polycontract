using System.Text.Json;

namespace OasPolycontract.Clients.CSharp;

public static class FeatureCases
{
    public static JsonElement ById(string caseId)
    {
        var path = Environment.GetEnvironmentVariable("FEATURE_CASES_PATH")
            ?? throw new InvalidOperationException("FEATURE_CASES_PATH is required");
        using var document = JsonDocument.Parse(File.ReadAllText(path));
        foreach (var scenario in document.RootElement.EnumerateArray())
        {
            if (scenario.GetProperty("caseId").GetString() == caseId)
                return scenario.Clone();
        }

        throw new InvalidOperationException($"Acceptance feature case not found: {caseId}");
    }
}
