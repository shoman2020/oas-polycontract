using System.Net;
using System.Text;
using Xunit;

namespace OasPolycontract.Clients.CSharp;

public sealed class OpenApiResponseValidatorConformanceTests
{
    [Fact]
    public async Task AdapterSupportsNullableExclusiveMinimumAndNestedReferences()
    {
        const string specification = """
            openapi: 3.0.3
            info:
              title: Validator conformance fixture
              version: 1.0.0
            paths:
              /probe:
                get:
                  responses:
                    "200":
                      description: Valid response
                      content:
                        application/json:
                          schema:
                            $ref: "#/components/schemas/Envelope"
            components:
              schemas:
                Envelope:
                  type: object
                  required: [label, child]
                  properties:
                    label:
                      type: string
                      nullable: true
                    child:
                      $ref: "#/components/schemas/Child"
                Child:
                  type: object
                  required: [score]
                  properties:
                    score:
                      type: number
                      minimum: 0
                      exclusiveMinimum: true
            """;
        var specificationPath = Path.Combine(Path.GetTempPath(), $"oas-validator-{Guid.NewGuid():N}.yaml");
        await File.WriteAllTextAsync(specificationPath, specification, TestContext.Current.CancellationToken);
        try
        {
            var validator = OpenApiResponseValidator.Load(specificationPath);
            using var validResponse = JsonResponse();
            await validator.ValidateAsync(
                validResponse,
                "{\"label\":null,\"child\":{\"score\":0.5}}",
                "/probe",
                "get");

            using var invalidResponse = JsonResponse();
            await Assert.ThrowsAsync<InvalidOperationException>(() => validator.ValidateAsync(
                invalidResponse,
                "{\"label\":\"ready\",\"child\":{\"score\":0}}",
                "/probe",
                "get"));

            using var invalidNestedReference = JsonResponse();
            await Assert.ThrowsAsync<InvalidOperationException>(() => validator.ValidateAsync(
                invalidNestedReference,
                "{\"label\":\"ready\",\"child\":{}}",
                "/probe",
                "get"));
        }
        finally
        {
            File.Delete(specificationPath);
        }
    }

    private static HttpResponseMessage JsonResponse() => new(HttpStatusCode.OK)
    {
        Content = new StringContent("{}", Encoding.UTF8, "application/json"),
    };
}
