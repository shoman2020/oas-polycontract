from dataclasses import dataclass, field
from typing import Protocol
from urllib.parse import quote, urlparse

import requests


ApiResponse = tuple[requests.PreparedRequest, requests.Response]


class ProductApi(Protocol):
    def get_product(self, sku: str) -> ApiResponse: ...


class StatefulOrderApi(Protocol):
    def create_order(self, sku: str, quantity: int) -> ApiResponse: ...

    def get_order(self, order_id: str) -> ApiResponse: ...

    def update_order(self, order_id: str, status: str) -> ApiResponse: ...

    def delete_order(self, order_id: str) -> ApiResponse: ...


@dataclass(slots=True)
class HttpApiClient:
    base_url: str
    timeout_seconds: float = 10
    session: requests.Session = field(default_factory=requests.Session, repr=False)

    def __post_init__(self):
        parsed_url = urlparse(self.base_url)
        if parsed_url.scheme not in {"http", "https"} or not parsed_url.netloc:
            raise ValueError("base_url must be an absolute HTTP or HTTPS URL")

    def send(self, method: str, path: str, body: dict | None = None) -> ApiResponse:
        request = requests.Request(
            method,
            f"{self.base_url.rstrip('/')}{path}",
            json=body,
        )
        prepared_request = self.session.prepare_request(request)
        response = self.session.send(prepared_request, timeout=self.timeout_seconds)
        return prepared_request, response

    def close(self) -> None:
        self.session.close()


class ProductApiClient(HttpApiClient):
    def get_product(self, sku: str) -> ApiResponse:
        return self.send("GET", f"/products/{quote(sku, safe='')}")

