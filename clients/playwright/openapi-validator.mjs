import { createValidator } from "@oaverify/core";
import { loadSpecSync } from "@oaverify/syntax";

const specPath = process.env.OPENAPI_SPEC;
if (!specPath) throw new Error("OPENAPI_SPEC must point to the reviewed OpenAPI contract");

const { document } = loadSpecSync({ entry: specPath });
const validator = createValidator(document);

export async function validateResponse(apiResponse, path) {
  const baseUrl = process.env.API_BASE_URL;
  if (!baseUrl) throw new Error("API_BASE_URL must point to the provider or Specmatic mock");

  const request = new Request(new URL(path, baseUrl));
  const status = apiResponse.status();
  const body = status === 204 || status === 304 ? null : await apiResponse.body();
  const response = new Response(body, {
    status,
    headers: apiResponse.headers(),
  });

  return validator.validateFetchResponse(request, response);
}

