import os

import pytest
from openapi_core import OpenAPI

from api_client import ProductApiClient
from order_api_client import StatefulOrderApiClient


@pytest.fixture(scope="session")
def product_api_client():
    return ProductApiClient(os.environ["API_BASE_URL"])


@pytest.fixture(scope="session")
def openapi_contract():
    return OpenAPI.from_file_path(os.environ["OPENAPI_SPEC"])


@pytest.fixture(scope="session")
def stateful_order_api_client():
    return StatefulOrderApiClient(os.environ["STATEFUL_API_BASE_URL"])


@pytest.fixture(scope="session")
def stateful_openapi_contract():
    return OpenAPI.from_file_path(os.environ["STATEFUL_OPENAPI_SPEC"])

