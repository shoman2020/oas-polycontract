from dataclasses import dataclass, field
from urllib.parse import quote

import requests


@dataclass(slots=True)
class StatefulOrderApiClient:
    base_url: str
    timeout_seconds: float = 10
    session: requests.Session = field(default_factory=requests.Session, repr=False)

    def create_order(self, sku: str, quantity: int):
        return self._send("POST", "/orders", {"sku": sku, "quantity": quantity})

    def get_order(self, order_id: str):
        return self._send("GET", f"/orders/{quote(order_id, safe='')}")

    def update_order(self, order_id: str, status: str):
        return self._send("PATCH", f"/orders/{quote(order_id, safe='')}", {"status": status})

    def delete_order(self, order_id: str):
        return self._send("DELETE", f"/orders/{quote(order_id, safe='')}")

    def _send(self, method: str, path: str, body: dict | None = None):
        request = requests.Request(
            method,
            f"{self.base_url.rstrip('/')}{path}",
            json=body,
        )
        prepared_request = self.session.prepare_request(request)
        response = self.session.send(prepared_request, timeout=self.timeout_seconds)
        return prepared_request, response
