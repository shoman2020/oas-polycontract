use jsonschema::validator_for;
use oas_polycontract_rust_client::{ProductApiClient, StatefulOrderApiClient};
use serde_json::Value;
use std::{env, error::Error, fs, io};

struct OpenApiResponseValidator {
    document: Value,
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
        let validator = validator_for(schema)?;
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
    let client = ProductApiClient::new(env::var("API_BASE_URL")?)?;
    let contract = OpenApiResponseValidator::from_file(&env::var("OPENAPI_SPEC")?)?;

    let (status, body) = validate_response(
        client.get_product("demo-sku").await?,
        &contract,
        "/products/{sku}",
        "get",
    )
    .await?;

    assert_eq!(status, 200);
    assert_eq!(body["sku"], "demo-sku");
    assert_eq!(body["available"], 7);
    println!("OAS validation passed: GET /products/demo-sku -> {status}");
    Ok(())
}

#[tokio::test]
async fn stateful_order_lifecycle_matches_openapi_contract() -> Result<(), Box<dyn Error>> {
    let client = StatefulOrderApiClient::new(env::var("STATEFUL_API_BASE_URL")?)?;
    let contract = OpenApiResponseValidator::from_file(&env::var("STATEFUL_OPENAPI_SPEC")?)?;

    let (status, created) = validate_response(
        client.create_order("demo-sku", 2).await?,
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

    let (status, updated) = validate_response(
        client.update_order(order_id, "confirmed").await?,
        &contract,
        "/orders/{orderId}",
        "patch",
    )
    .await?;
    assert_eq!(status, 200);
    assert_eq!(updated["status"], "confirmed");

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
