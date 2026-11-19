from urllib.parse import quote

from api_client import ApiResponse, HttpApiClient, StatefulOrderApi


class StatefulOrderApiClient(HttpApiClient, StatefulOrderApi):
    def create_order(self, sku: str, quantity: int) -> ApiResponse:
        return self.send("POST", "/orders", {"sku": sku, "quantity": quantity})

    def get_order(self, order_id: str) -> ApiResponse:
        return self.send("GET", f"/orders/{quote(order_id, safe='')}")

    def update_order(self, order_id: str, status: str) -> ApiResponse:
        return self.send("PATCH", f"/orders/{quote(order_id, safe='')}", {"status": status})

    def delete_order(self, order_id: str) -> ApiResponse:
        return self.send("DELETE", f"/orders/{quote(order_id, safe='')}")
