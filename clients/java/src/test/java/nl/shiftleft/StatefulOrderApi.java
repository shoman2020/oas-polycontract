package nl.shiftleft;

import io.restassured.response.Response;

interface StatefulOrderApi {
    Response createOrder(String sku, int quantity);
    Response getOrder(String orderId);
    Response updateOrder(String orderId, String status);
    Response deleteOrder(String orderId);
}
