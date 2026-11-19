# Postman and Bruno examples

These project-specific collections support manual API debugging and migration. They follow the Product and Order OAS; no team-owned exports were provided. The request structure draws on [Newman's sample collection](https://github.com/postmanlabs/newman/blob/develop/examples/sample-collection.json) and [Bruno's JSON testing examples](https://github.com/bruno-collections/json-testing-examples).

## Start the demo APIs

Commands below use Bash, Node.js, and a Docker-compatible runtime. In one terminal, start WireMock from the pinned version and run the Product API:

```sh
source .github/versions.env
docker run --rm -d --name oas-polycontract-wiremock \
  -p 127.0.0.1:8081:8080 \
  -v "$PWD/demo/downstream/wiremock:/home/wiremock:ro" \
  "wiremock/wiremock:$WIREMOCK_VERSION" --global-response-templating
PORT=8080 INVENTORY_URL=http://127.0.0.1:8081 node demo/app/server.mjs
```

In a second terminal, start the Order API:

```sh
PORT=8083 node demo/stateful/server.mjs
```

Import `postman/oas-polycontract.postman_collection.json` and `postman/local.postman_environment.json` into Postman, or open `bruno/` in Bruno. Product runs at `localhost:8080`; Order runs at `localhost:8083`. Run Order requests in sequence: create, read, confirm, and delete. Stop both Node processes with Ctrl+C and remove WireMock with `docker rm -f oas-polycontract-wiremock`.

The automated pipeline uses Testcontainers and cleans up its services. These commands keep services available for interactive collection use.
