from dataclasses import dataclass, field
from urllib.parse import quote

import requests


@dataclass(slots=True)
class ProductApiClient:
    base_url: str
    timeout_seconds: float = 10
    session: requests.Session = field(default_factory=requests.Session, repr=False)

    def get_product(self, sku: str) -> tuple[requests.Request, requests.Response]:
        url = f"{self.base_url.rstrip('/')}/products/{quote(sku, safe='')}"
        request = requests.Request("GET", url)
        prepared_request = self.session.prepare_request(request)
        response = self.session.send(prepared_request, timeout=self.timeout_seconds)
        return request, response

