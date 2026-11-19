package nl.shiftleft;

import io.restassured.response.Response;

interface ProductApi {
    Response getProduct(String sku);
    Response getProductPathUnvalidated(String path);
}
