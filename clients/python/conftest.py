import json
import os
from collections.abc import Generator

import pytest
from openapi_core import OpenAPI

from api_client import ProductApi, ProductApiClient, StatefulOrderApi
from order_api_client import StatefulOrderApiClient


@pytest.fixture
def product_api_client() -> Generator[ProductApi, None, None]:
    client = ProductApiClient(os.environ["API_BASE_URL"])
    try:
        yield client
    finally:
        client.close()


@pytest.fixture(scope="session")
def openapi_contract():
    return OpenAPI.from_file_path(os.environ["OPENAPI_SPEC"])


@pytest.fixture
def stateful_order_api_client() -> Generator[StatefulOrderApi, None, None]:
    client = StatefulOrderApiClient(os.environ["STATEFUL_API_BASE_URL"])
    try:
        yield client
    finally:
        client.close()


@pytest.fixture(scope="session")
def stateful_openapi_contract():
    return OpenAPI.from_file_path(os.environ["STATEFUL_OPENAPI_SPEC"])


@pytest.fixture(scope="session")
def feature_cases():
    with open(os.environ["FEATURE_CASES_PATH"], encoding="utf-8") as feature_file:
        return {case["caseId"]: case for case in json.load(feature_file)}

