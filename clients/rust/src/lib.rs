pub struct ProductApiClient {
    base_url: String,
    http: reqwest::Client,
}

impl ProductApiClient {
    pub fn new(base_url: impl Into<String>) -> Result<Self, reqwest::Error> {
        let http = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(10))
            .build()?;
        Ok(Self {
            base_url: base_url.into().trim_end_matches('/').to_owned(),
            http,
        })
    }

    pub async fn get_product(
        &self,
        sku: &str,
    ) -> Result<reqwest::Response, reqwest::Error> {
        self.http
            .get(format!("{}/products/{sku}", self.base_url))
            .send()
            .await
    }
}

pub struct StatefulOrderApiClient {
    base_url: String,
    http: reqwest::Client,
}

impl StatefulOrderApiClient {
    pub fn new(base_url: impl Into<String>) -> Result<Self, reqwest::Error> {
        let http = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(10))
            .build()?;
        Ok(Self {
            base_url: base_url.into().trim_end_matches('/').to_owned(),
            http,
        })
    }

    pub async fn create_order(
        &self,
        sku: &str,
        quantity: u32,
    ) -> Result<reqwest::Response, reqwest::Error> {
        self.http
            .post(format!("{}/orders", self.base_url))
            .json(&serde_json::json!({ "sku": sku, "quantity": quantity }))
            .send()
            .await
    }

    pub async fn get_order(&self, order_id: &str) -> Result<reqwest::Response, reqwest::Error> {
        self.http
            .get(format!("{}/orders/{order_id}", self.base_url))
            .send()
            .await
    }

    pub async fn update_order(
        &self,
        order_id: &str,
        status: &str,
    ) -> Result<reqwest::Response, reqwest::Error> {
        self.http
            .patch(format!("{}/orders/{order_id}", self.base_url))
            .json(&serde_json::json!({ "status": status }))
            .send()
            .await
    }

    pub async fn delete_order(&self, order_id: &str) -> Result<reqwest::Response, reqwest::Error> {
        self.http
            .delete(format!("{}/orders/{order_id}", self.base_url))
            .send()
            .await
    }
}

