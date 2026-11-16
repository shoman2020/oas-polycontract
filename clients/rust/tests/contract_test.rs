use jsonschema::validator_for;
use serde_json::Value;
use std::{env, fs};

#[tokio::test]
async fn product_response_matches_openapi_contract() -> Result<(), Box<dyn std::error::Error>> {
    let base_url = env::var("API_BASE_URL")?;
    let spec_path = env::var("OPENAPI_SPEC")?;
    let spec_text = fs::read_to_string(spec_path)?;
    let spec: Value = serde_yaml_ng::from_str(&spec_text)?;

    let response = reqwest::get(format!("{base_url}/products/demo-sku")).await?;
    let status = response.status().as_u16();
    assert!(
        spec.pointer(&format!("/paths/~1products~1{{sku}}/get/responses/{status}")).is_some(),
        "HTTP {status} is not declared for GET /products/{{sku}}"
    );
    assert_eq!(response.headers().get("content-type").and_then(|h| h.to_str().ok()), Some("application/json"));

    let body: Value = response.json().await?;
    let schema_ref = spec
        .pointer(&format!("/paths/~1products~1{{sku}}/get/responses/{status}/content/application~1json/schema/$ref"))
        .and_then(Value::as_str)
        .expect("the response schema must be a local OAS reference");
    let schema_pointer = schema_ref.strip_prefix('#').expect("expected an internal schema reference");
    let schema = spec.pointer(schema_pointer).expect("referenced OAS schema must exist");
    let validator = validator_for(schema)?;
    validator.validate(&body)?;

    assert_eq!(body["sku"], "demo-sku");
    assert_eq!(body["available"], 7);
    println!("OAS validation passed: GET /products/demo-sku -> {status}");
    Ok(())
}
