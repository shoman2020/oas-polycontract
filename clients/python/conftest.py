import os

import pytest
from openapi_core import OpenAPI

from api_client import ProductApiClient


@pytest.fixture(scope="session")
def product_api_client():
    return ProductApiClient(os.environ["API_BASE_URL"])


@pytest.fixture(scope="session")
def openapi_contract():
    return OpenAPI.from_file_path(os.environ["OPENAPI_SPEC"])

