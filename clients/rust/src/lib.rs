use percent_encoding::{utf8_percent_encode, NON_ALPHANUMERIC};

struct HttpApiClient {
    base_url: String,
    http: reqwest::Client,
}

impl HttpApiClient {
    fn new(base_url: impl Into<String>) -> Result<Self, reqwest::Error> {
        let http = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(10))
            .build()?;
        Ok(Self {
            base_url: base_url.into().trim_end_matches('/').to_owned(),
            http,
        })
    }

    fn request(&self, method: reqwest::Method, path: &str) -> reqwest::RequestBuilder {
        self.http.request(method, format!("{}{path}", self.base_url))
    }
}

fn encode_path_segment(s: &str) -> String {
    utf8_percent_encode(s, NON_ALPHANUMERIC).to_string()
}

pub struct ProductApiClient {
    http: HttpApiClient,
}

impl ProductApiClient {
    pub fn new(base_url: impl Into<String>) -> Result<Self, reqwest::Error> {
        Ok(Self { http: HttpApiClient::new(base_url)? })
    }

    pub async fn get_product(&self, sku: &str) -> Result<reqwest::Response, reqwest::Error> {
        self.http
            .request(reqwest::Method::GET, &format!("/products/{}", encode_path_segment(sku)))
            .send()
            .await
    }

    pub async fn get_product_path(&self, path: &str) -> Result<reqwest::Response, reqwest::Error> {
        self.http
            .request(reqwest::Method::GET, path)
            .send()
            .await
    }
}

pub struct StatefulOrderApiClient {
    http: HttpApiClient,
}

impl StatefulOrderApiClient {
    pub fn new(base_url: impl Into<String>) -> Result<Self, reqwest::Error> {
        Ok(Self { http: HttpApiClient::new(base_url)? })
    }

    pub async fn create_order(
        &self,
        sku: &str,
        quantity: u32,
    ) -> Result<reqwest::Response, reqwest::Error> {
        self.http
            .request(reqwest::Method::POST, "/orders")
            .json(&serde_json::json!({ "sku": sku, "quantity": quantity }))
            .send()
            .await
    }

    pub async fn get_order(&self, order_id: &str) -> Result<reqwest::Response, reqwest::Error> {
        self.http
            .request(reqwest::Method::GET, &format!("/orders/{}", encode_path_segment(order_id)))
            .send()
            .await
    }

    pub async fn update_order(
        &self,
        order_id: &str,
        status: &str,
    ) -> Result<reqwest::Response, reqwest::Error> {
        self.http
            .request(reqwest::Method::PATCH, &format!("/orders/{}", encode_path_segment(order_id)))
            .json(&serde_json::json!({ "status": status }))
            .send()
            .await
    }

    pub async fn delete_order(&self, order_id: &str) -> Result<reqwest::Response, reqwest::Error> {
        self.http
            .request(reqwest::Method::DELETE, &format!("/orders/{}", encode_path_segment(order_id)))
            .send()
            .await
    }
}

