use jsonschema::validator_for;
use oas_polycontract_rust_client::{ProductApiClient, StatefulOrderApiClient};
use serde_json::Value;
use std::{env, error::Error, fs, io};

mod feature_cases;

struct OpenApiResponseValidator {
    document: Value,
}

fn normalize_openapi_schema(schema: &Value, document: &Value) -> Value {
    fn normalize_exclusive_bound(
        object: &mut serde_json::Map<String, Value>,
        exclusive_key: &str,
        bound_key: &str,
    ) {
        match object.get(exclusive_key).and_then(Value::as_bool) {
            Some(true) => {
                if let Some(bound) = object.remove(bound_key) {
                    object.insert(exclusive_key.to_owned(), bound);
                }
            }
            Some(false) => {
                object.remove(exclusive_key);
            }
            None => {}
        }
    }

    fn normalize_node(node: &mut Value) {
        match node {
            Value::Object(object) => {
                let nullable = object
                    .remove("nullable")
                    .and_then(|value| value.as_bool())
                    .unwrap_or(false);

                normalize_exclusive_bound(object, "exclusiveMinimum", "minimum");
                normalize_exclusive_bound(object, "exclusiveMaximum", "maximum");

                if let Some(Value::String(reference)) = object.get_mut("$ref") {
                    if let Some(name) = reference.strip_prefix("#/components/schemas/") {
                        *reference = format!("#/$defs/{name}");
                    }
                }
                for value in object.values_mut() {
                    normalize_node(value);
                }

                if nullable {
                    if let Some(Value::String(schema_type)) = object.get("type").cloned() {
                        object.insert(
                            "type".to_owned(),
                            Value::Array(vec![Value::String(schema_type), Value::String("null".to_owned())]),
                        );
                    } else {
                        let non_null = Value::Object(std::mem::take(object));
                        let null_schema = serde_json::json!({ "type": "null" });
                        object.insert("anyOf".to_owned(), Value::Array(vec![non_null, null_schema]));
                    }
                }
            }
            Value::Array(items) => {
                for item in items {
                    normalize_node(item);
                }
            }
            _ => {}
        }
    }

    let mut normalized = schema.clone();
    if let Some(root) = normalized.as_object_mut() {
        if let Some(definitions) = document.pointer("/components/schemas").and_then(Value::as_object) {
            root.insert("$defs".to_owned(), Value::Object(definitions.clone()));
        }
        root.insert(
            "$schema".to_owned(),
            Value::String("https://json-schema.org/draft/2020-12/schema".to_owned()),
        );
    }
    normalize_node(&mut normalized);
    normalized
}

impl OpenApiResponseValidator {
    fn from_file(path: &str) -> Result<Self, Box<dyn Error>> {
        let source = fs::read_to_string(path)?;
        Ok(Self {
            document: serde_yaml_ng::from_str(&source)?,
        })
    }

    fn validate(
        &self,
        operation_path: &str,
        method: &str,
        status: u16,
        content_type: Option<&str>,
        body: &[u8],
    ) -> Result<(), Box<dyn Error>> {
        let escaped_path = operation_path.replace('~', "~0").replace('/', "~1");
        let response_path = format!("/paths/{escaped_path}/{method}/responses/{status}");
        let response = self.document.pointer(&response_path).ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::InvalidData,
                format!("HTTP {status} is not declared for {method} {operation_path}"),
            )
        })?;

        let Some(content) = response.get("content") else {
            if body.is_empty() {
                return Ok(());
            }
            return Err(io::Error::new(
                io::ErrorKind::InvalidData,
                format!("{method} {operation_path} HTTP {status} must not have a body"),
            )
            .into());
        };

        let media_type = content_type
            .and_then(|value| value.split(';').next())
            .map(str::trim)
            .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidData, "missing Content-Type"))?;
        let schema = content
            .get(media_type)
            .and_then(|media| media.get("schema"))
            .ok_or_else(|| {
                io::Error::new(
                    io::ErrorKind::InvalidData,
                    format!("response media type {media_type} is not declared in the OAS"),
                )
            })?;
        let schema = if let Some(reference) = schema.get("$ref").and_then(Value::as_str) {
            let pointer = reference.strip_prefix('#').ok_or_else(|| {
                io::Error::new(io::ErrorKind::InvalidData, "only local OAS references are supported")
            })?;
            self.document.pointer(pointer).ok_or_else(|| {
                io::Error::new(io::ErrorKind::InvalidData, "referenced OAS schema does not exist")
            })?
        } else {
            schema
        };

        let body: Value = serde_json::from_slice(body)?;
        let schema = normalize_openapi_schema(schema, &self.document);
        let validator = validator_for(&schema)?;
        let errors: Vec<String> = validator.iter_errors(&body).map(|error| error.to_string()).collect();
        if !errors.is_empty() {
            return Err(io::Error::new(
                io::ErrorKind::InvalidData,
                format!("response does not match OAS schema: {}", errors.join("; ")),
            )
            .into());
        }
        Ok(())
    }
}

#[test]
fn nullable_schema_accepts_null_and_declared_type() {
    let schema = serde_json::json!({
        "type": "object",
        "properties": {
            "label": { "type": "string", "nullable": true }
        }
    });
    let normalized = normalize_openapi_schema(&schema, &serde_json::json!({}));
    assert_eq!(normalized.pointer("/properties/label/type"), Some(&serde_json::json!(["string", "null"])));
    let validator = validator_for(&normalized).expect("nullable schema is supported");

    assert!(validator.is_valid(&serde_json::json!({ "label": null })));
    assert!(validator.is_valid(&serde_json::json!({ "label": "available" })));
    assert!(!validator.is_valid(&serde_json::json!({ "label": 42 })));
}

#[test]
fn exclusive_minimum_true_rejects_the_boundary_value() {
    let schema = serde_json::json!({
        "type": "object",
        "properties": {
            "score": { "type": "number", "minimum": 0, "exclusiveMinimum": true }
        }
    });
    let normalized = normalize_openapi_schema(&schema, &serde_json::json!({}));
    let validator = validator_for(&normalized).expect("exclusive minimum is supported");

    assert!(validator.is_valid(&serde_json::json!({ "score": 0.01 })));
    assert!(!validator.is_valid(&serde_json::json!({ "score": 0 })));
}

#[test]
fn exclusive_minimum_false_keeps_the_inclusive_minimum() {
    let schema = serde_json::json!({
        "type": "object",
        "properties": {
            "score": { "type": "number", "minimum": 0, "exclusiveMinimum": false }
        }
    });
    let normalized = normalize_openapi_schema(&schema, &serde_json::json!({}));
    let validator = validator_for(&normalized).expect("inclusive minimum is supported");

    assert!(validator.is_valid(&serde_json::json!({ "score": 0 })));
    assert!(!validator.is_valid(&serde_json::json!({ "score": -0.01 })));
}

#[test]
fn nested_local_references_are_rewritten_recursively() {
    let document = serde_json::json!({
        "components": {
            "schemas": {
                "Child": {
                    "type": "object",
                    "required": ["score"],
                    "properties": {
                        "score": { "type": "number", "minimum": 0, "exclusiveMinimum": true }
                    }
                }
            }
        }
    });
    let schema = serde_json::json!({
        "type": "object",
        "required": ["child", "children"],
        "properties": {
            "child": { "$ref": "#/components/schemas/Child" },
            "children": {
                "type": "array",
                "items": { "$ref": "#/components/schemas/Child" }
            }
        }
    });
    let normalized = normalize_openapi_schema(&schema, &document);
    assert_eq!(normalized.pointer("/properties/child/$ref"), Some(&serde_json::json!("#/$defs/Child")));
    assert_eq!(normalized.pointer("/properties/children/items/$ref"), Some(&serde_json::json!("#/$defs/Child")));
    let validator = validator_for(&normalized).expect("nested local references are supported");

    assert!(validator.is_valid(&serde_json::json!({
        "child": { "score": 0.5 },
        "children": [{ "score": 1.0 }]
    })));
    assert!(!validator.is_valid(&serde_json::json!({
        "child": { "score": 0 },
        "children": []
    })));
}

async fn validate_response(
    response: reqwest::Response,
    contract: &OpenApiResponseValidator,
    operation_path: &str,
    method: &str,
) -> Result<(u16, Value), Box<dyn Error>> {
    let status = response.status().as_u16();
    let content_type = response
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .map(str::to_owned);
    let body = response.bytes().await?;
    contract.validate(operation_path, method, status, content_type.as_deref(), &body)?;
    let parsed = if body.is_empty() {
        Value::Null
    } else {
        serde_json::from_slice(&body)?
    };
    Ok((status, parsed))
}

#[tokio::test]
async fn product_response_matches_openapi_contract() -> Result<(), Box<dyn Error>> {
    let scenario = feature_cases::acceptance_case("product.available")?;
    let sku = scenario["sku"].as_str().ok_or("feature data has no product SKU")?;
    let client = ProductApiClient::new(env::var("API_BASE_URL")?)?;
    let contract = OpenApiResponseValidator::from_file(&env::var("OPENAPI_SPEC")?)?;

    let (status, body) = validate_response(
        client.get_product(sku).await?,
        &contract,
        "/products/{sku}",
        "get",
    )
    .await?;

    assert_eq!(status, scenario["expectedStatus"].as_u64().ok_or("feature data has no status")? as u16);
    assert_eq!(body["sku"], sku);
    assert_eq!(body["available"], scenario["available"]);
    println!("OAS validation passed: GET /products/{sku} -> {status}");
    Ok(())
}

#[tokio::test]
async fn product_error_scenarios_match_openapi_contract() -> Result<(), Box<dyn Error>> {
    let contract = OpenApiResponseValidator::from_file(&env::var("OPENAPI_SPEC")?)?;
    let api = ProductApiClient::new(env::var("API_BASE_URL")?)?;

    for case_id in ["product.not-found", "product.bad-upstream"] {
        let scenario = feature_cases::acceptance_case(case_id)?;
        let sku = scenario["sku"].as_str().ok_or("feature data has no product SKU")?;
        let (status, body) = validate_response(
            api.get_product(sku).await?,
            &contract,
            "/products/{sku}",
            "get",
        )
        .await?;
        assert_eq!(status, scenario["expectedStatus"].as_u64().ok_or("feature data has no status")? as u16);
        assert_eq!(body["message"], scenario["expectedMessage"]);
    }

    let scenario = feature_cases::acceptance_case("product.malformed-path")?;
    let path = scenario["path"].as_str().ok_or("feature data has no path")?;
    let response = api.get_product_path(path).await?;
    let (status, body) = validate_response(response, &contract, "/products/{sku}", "get").await?;
    assert_eq!(status, scenario["expectedStatus"].as_u64().ok_or("feature data has no status")? as u16);
    assert_eq!(body["message"], scenario["expectedMessage"]);
    Ok(())
}

#[tokio::test]
async fn stateful_order_lifecycle_matches_openapi_contract() -> Result<(), Box<dyn Error>> {
    let scenario = feature_cases::acceptance_case("order.confirm")?;
    let sku = scenario["sku"].as_str().ok_or("feature data has no order SKU")?;
    let quantity = scenario["quantity"].as_u64().ok_or("feature data has no quantity")? as u32;
    let target_status = scenario["status"].as_str().ok_or("feature data has no target status")?;
    let repeat_count = scenario["repeatCount"].as_u64().ok_or("feature data has no repeat count")?;
    let client = StatefulOrderApiClient::new(env::var("STATEFUL_API_BASE_URL")?)?;
    let contract = OpenApiResponseValidator::from_file(&env::var("STATEFUL_OPENAPI_SPEC")?)?;

    let (status, created) = validate_response(
        client.create_order(sku, quantity).await?,
        &contract,
        "/orders",
        "post",
    )
    .await?;
    assert_eq!(status, 201);
    assert_eq!(created["status"], "created");
    let order_id = created["id"].as_str().expect("created order includes an id");

    let (status, fetched) = validate_response(
        client.get_order(order_id).await?,
        &contract,
        "/orders/{orderId}",
        "get",
    )
    .await?;
    assert_eq!(status, 200);
    assert_eq!(fetched["id"], order_id);

    for _ in 0..repeat_count {
        let (response_status, updated) = validate_response(
            client.update_order(order_id, target_status).await?,
            &contract,
            "/orders/{orderId}",
            "patch",
        )
        .await?;
        assert_eq!(response_status, scenario["expectedStatus"].as_u64().ok_or("feature data has no status")? as u16);
        assert_eq!(updated["status"], target_status);
    }

    let (status, _) = validate_response(
        client.delete_order(order_id).await?,
        &contract,
        "/orders/{orderId}",
        "delete",
    )
    .await?;
    assert_eq!(status, 204);

    let (status, missing) = validate_response(
        client.get_order(order_id).await?,
        &contract,
        "/orders/{orderId}",
        "get",
    )
    .await?;
    assert_eq!(status, 404);
    assert_eq!(missing["message"], "Order not found");
    println!("Stateful OAS validation passed: create -> read -> confirm -> delete -> 404");
    Ok(())
}

#[tokio::test]
async fn order_error_scenarios_match_openapi_contract() -> Result<(), Box<dyn Error>> {
    let scenario = feature_cases::acceptance_case("order.invalid")?;
    let client = StatefulOrderApiClient::new(env::var("STATEFUL_API_BASE_URL")?)?;
    let contract = OpenApiResponseValidator::from_file(&env::var("STATEFUL_OPENAPI_SPEC")?)?;

    let (status, _) = validate_response(
        client.create_order(
            scenario["sku"].as_str().ok_or("feature data has no SKU")?,
            scenario["quantity"].as_u64().ok_or("feature data has no quantity")? as u32,
        ).await?,
        &contract,
        "/orders",
        "post",
    ).await?;
    assert_eq!(status, scenario["expectedStatus"].as_u64().ok_or("feature data has no status")? as u16);

    let scenario = feature_cases::acceptance_case("order.illegal-transition")?;
    let repeat_count = scenario["repeatCount"].as_u64().ok_or("feature data has no repeat count")?;
    let (_, created) = validate_response(
        client.create_order(
            scenario["sku"].as_str().ok_or("feature data has no SKU")?,
            scenario["quantity"].as_u64().ok_or("feature data has no quantity")? as u32,
        ).await?, &contract, "/orders", "post",
    ).await?;
    let order_id = created["id"].as_str().ok_or("created order has no id")?;
    for _ in 0..repeat_count {
        let (status, body) = validate_response(
            client.update_order(order_id, scenario["initialStatus"].as_str().ok_or("feature data has no initial status")?).await?,
            &contract, "/orders/{orderId}", "patch",
        ).await?;
        assert_eq!(status, 200);
        assert_eq!(body["status"], scenario["persistedStatus"]);
    }
    let (status, conflict) = validate_response(
        client.update_order(order_id, scenario["requestedStatus"].as_str().ok_or("feature data has no requested status")?).await?,
        &contract, "/orders/{orderId}", "patch",
    ).await?;
    assert_eq!(status, scenario["expectedStatus"].as_u64().ok_or("feature data has no status")? as u16);
    assert!(conflict["message"].as_str().is_some());

    let (status, unchanged) = validate_response(client.get_order(order_id).await?, &contract, "/orders/{orderId}", "get").await?;
    assert_eq!(status, 200);
    assert_eq!(unchanged["status"], scenario["persistedStatus"]);
    let (status, _) = validate_response(client.delete_order(order_id).await?, &contract, "/orders/{orderId}", "delete").await?;
    assert_eq!(status, 204);

    let scenario = feature_cases::acceptance_case("order.unsupported-method")?;
    let url = format!("{}{}", env::var("STATEFUL_API_BASE_URL")?.trim_end_matches('/'), scenario["path"].as_str().ok_or("feature data has no path")?);
    let response = reqwest::Client::new().post(url).send().await?;
    assert_eq!(response.status().as_u16(), scenario["expectedStatus"].as_u64().ok_or("feature data has no status")? as u16);
    assert_eq!(response.headers().get("allow").and_then(|value| value.to_str().ok()), scenario["allowedMethod"].as_str());
    Ok(())
}
