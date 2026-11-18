# Legacy API collections

These collections are project-specific examples for manual API debugging and migration. They follow the Product and Order OAS files; no team-owned exports were present to convert.

The Postman request and assertion structure is informed by [Newman's sample collection](https://github.com/postmanlabs/newman/blob/develop/examples/sample-collection.json). Bruno request and JSON assertion examples are informed by [bruno-collections/json-testing-examples](https://github.com/bruno-collections/json-testing-examples). The requests and payloads here are project-specific.

To use the collections against local services, start the demo APIs from the repository root. These commands publish only loopback ports:

```sh
set -a
source .github/versions.env
set +a
docker network create oas-polycontract-debug
docker build --build-arg WIREMOCK_VERSION="$WIREMOCK_VERSION" -t oas-polycontract-wiremock:local demo/wiremock
docker build --build-arg NODE_VERSION="$NODE_VERSION" -t oas-polycontract-app:local demo/app
docker build --build-arg NODE_VERSION="$NODE_VERSION" -t oas-polycontract-stateful:local demo/stateful
docker run -d --name oas-polycontract-wiremock --network oas-polycontract-debug -p 127.0.0.1:8081:8080 -v "$PWD/demo/downstream/wiremock:/home/wiremock:ro" oas-polycontract-wiremock:local --global-response-templating
docker run -d --name oas-polycontract-app --network oas-polycontract-debug -p 127.0.0.1:8080:8080 -e PORT=8080 -e INVENTORY_URL=http://oas-polycontract-wiremock:8080 oas-polycontract-app:local
docker run -d --name oas-polycontract-stateful --network oas-polycontract-debug -p 127.0.0.1:8083:8082 -e PORT=8082 oas-polycontract-stateful:local
```

Import `postman/oas-polycontract.postman_collection.json` and `postman/local.postman_environment.json` into Postman. Or open `bruno/` in Bruno; its collection variables contain the local URLs. Run the Order requests in sequence. Create saves an ID for read, confirm, and delete.

Product API runs at `http://localhost:8080`; Order API runs at `http://localhost:8083`. Remove the containers and network when finished:

```sh
docker rm -f oas-polycontract-app oas-polycontract-stateful oas-polycontract-wiremock
docker network rm oas-polycontract-debug
```

The CI and demonstration pipeline uses Testcontainers and removes its isolated network automatically. These manual commands are only for local interactive debugging. Use the collections to inspect requests and responses or map existing workflows to OAS.
