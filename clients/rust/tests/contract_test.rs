use jsonschema::validator_for;
use oas_polycontract_rust_client::ProductApiClient;
use serde_json::Value;
use std::{env, fs};

#[tokio::test]
async fn product_response_matches_openapi_contract() -> Result<(), Box<dyn std::error::Error>> {
    let client = ProductApiClient::new(env::var("API_BASE_URL")?)?;
    let spec_path = env::var("OPENAPI_SPEC")?;
    let spec_text = fs::read_to_string(spec_path)?;
    let spec: Value = serde_yaml_ng::from_str(&spec_text)?;

    let response = client.get_product("demo-sku").await?;
    let status = response.status().as_u16();
    assert!(
        spec.pointer(&format!("/paths/~1products~1{{sku}}/get/responses/{status}")).is_some(),
        "HTTP {status} is not declared for GET /products/{{sku}}"
    );
    assert_eq!(
        response
            .headers()
            .get("content-type")
            .and_then(|header| header.to_str().ok()),
        Some("application/json")
    );

    let body: Value = response.json().await?;
    let schema_ref = spec
        .pointer(&format!("/paths/~1products~1{{sku}}/get/responses/{status}/content/application~1json/schema/$ref"))
        .and_then(Value::as_str)
        .expect("the response schema must be a local OAS reference");
    let schema_pointer = schema_ref.strip_prefix('#').expect("expected an internal schema reference");
    let schema = spec.pointer(schema_pointer).expect("referenced OAS schema must exist");
    let validator = validator_for(schema)?;
    let validation_errors: Vec<String> = validator
        .iter_errors(&body)
        .map(|error| error.to_string())
        .collect();
    assert!(
        validation_errors.is_empty(),
        "response does not match OAS schema: {}",
        validation_errors.join("; ")
    );

    assert_eq!(body["sku"], "demo-sku");
    assert_eq!(body["available"], 7);
    println!("OAS validation passed: GET /products/demo-sku -> {status}");
    Ok(())
}
