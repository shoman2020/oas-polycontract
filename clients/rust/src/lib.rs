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

