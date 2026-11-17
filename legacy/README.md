# Legacy API collections

These collections are project-specific examples for manual API debugging and migration. They follow the Product and Order OAS files; no team-owned exports were present to convert.

The Postman request and assertion structure is informed by [Newman's sample collection](https://github.com/postmanlabs/newman/blob/develop/examples/sample-collection.json). Bruno request and JSON assertion examples are informed by [bruno-collections/json-testing-examples](https://github.com/bruno-collections/json-testing-examples). The requests and payloads here are project-specific.

Start the local services from the repository root:

```sh
docker compose --env-file .github/versions.env --profile test up -d app stateful-app
```

Import `postman/oas-polycontract.postman_collection.json` and `postman/local.postman_environment.json` into Postman. Or open `bruno/` in Bruno; its collection variables contain the local URLs. Run the Order requests in sequence. Create saves an ID for read, confirm, and delete.

Product API runs at `http://localhost:8080`; Order API runs at `http://localhost:8083`. Stop the services with:

```sh
docker compose --env-file .github/versions.env --profile test down
```

Use the collections to inspect requests and responses or to map existing workflows to OAS. CI uses Specmatic, Schemathesis, WireMock, and code-based API integration suites.
