import { readFileSync, existsSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const evaluationPath = resolve(repositoryRoot, 'evals/project-evals.json');
const suite = JSON.parse(readFileSync(evaluationPath, 'utf8'));
const failures = [];
const results = [];

function readRepositoryFile(path) {
  return readFileSync(resolve(repositoryRoot, path), 'utf8');
}

function assertRepositoryPath(path, checkId) {
  if (!existsSync(resolve(repositoryRoot, path))) {
    failures.push(`${checkId}: missing ${path}`);
    return false;
  }
  return true;
}

function checkReadmeLinks() {
  let linkCount = 0;
  for (const documentPath of ['README.md', 'clients/README.md']) {
    const document = readRepositoryFile(documentPath);
    const links = [...document.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)]
      .map((match) => match[1].trim().split(/[?#]/, 1)[0])
      .filter((target) => target && !/^[a-z][a-z\d+.-]*:/i.test(target) && !target.startsWith('#'));

    for (const target of links) {
      const absolutePath = resolve(repositoryRoot, dirname(documentPath), decodeURIComponent(target));
      const repositoryPath = relative(repositoryRoot, absolutePath);
      if (repositoryPath.startsWith('..')) {
        failures.push(`readme-links: ${documentPath} links outside the repository: ${target}`);
        continue;
      }
      assertRepositoryPath(repositoryPath, 'readme-links');
    }
    linkCount += links.length;
  }
  return linkCount;
}

function checkReadmeTree() {
  const readme = readRepositoryFile('README.md');
  const section = readme.match(/## Project structure\s+([\s\S]*?)(?=\n## |\s*$)/);
  if (!section) throw new Error('README project structure table was not found');
  const paths = [...section[1].matchAll(/^\|\s*([^|]+?)\s*\|/gm)]
    .map((match) => match[1].trim())
    .filter((path) => path !== 'Path' && !/^[- ]+$/.test(path))
    .flatMap((path) => path.split(/\s*;\s*/));

  for (const path of paths) assertRepositoryPath(path, 'readme-structure');
  return paths.length;
}

function checkArchitectureMap() {
  const readme = readRepositoryFile('README.md');
  const start = readme.indexOf('## Architecture');
  const end = start < 0 ? -1 : readme.indexOf('\n## ', start + '## Architecture'.length);
  if (start < 0 || end < 0) {
    failures.push('architecture-map: README architecture section was not found');
    return 0;
  }
  const architecture = readme.slice(start, end);

  const layers = [
    ['Specifications', '`openapi/`, `demo/`, `contracts/events/`'],
    ['Demo services', '`demo/`'],
    ['Native clients', '`clients/`'],
    ['Orchestration', '`pipeline/run.mjs`'],
    ['Shared configuration', '`pipeline/config.mjs`, `.github/versions.env`'],
    ['Quality checks', '`gates/`, `evals/`, `.github/workflows/`'],
  ];
  for (const [layer, source] of layers) {
    if (!architecture.includes(`| ${layer} |`) || !architecture.includes(source)) {
      failures.push(`architecture-map: README does not map ${layer} to ${source}`);
    }
  }

  const config = readRepositoryFile('pipeline/config.mjs');
  const runner = readRepositoryFile('pipeline/run.mjs');
  if (!config.includes('export function parseVersionPins')
      || !config.includes('export function readVersionPins')
      || !runner.includes('readVersionPins(')) {
    failures.push('architecture-map: runtime pin parsing is not separated from pipeline orchestration');
  }
  return layers.length;
}

function checkFilesExist(paths, checkId) {
  for (const path of paths) assertRepositoryPath(path, checkId);
  return paths.length;
}

function checkMockDataEvaluations(path) {
  const evaluation = JSON.parse(readRepositoryFile(path));
  const dictionary = readRepositoryFile(evaluation.dictionary);
  for (const testCase of evaluation.cases) {
    if (testCase.kind === 'external-example') {
      const fixture = JSON.parse(readRepositoryFile(testCase.fixture));
      if (fixture['http-request']?.path !== testCase.path) {
        failures.push(`mock-data-evaluations: ${testCase.id} fixture path does not match ${testCase.path}`);
      }
      if (fixture['http-response']?.status !== testCase.expected.status
          || JSON.stringify(fixture['http-response']?.body) !== JSON.stringify(testCase.expected.body)) {
        failures.push(`mock-data-evaluations: ${testCase.id} expected output differs from its fixture`);
      }
    } else if (testCase.kind === 'dictionary-fallback') {
      for (const values of Object.values(testCase.allowed)) {
        for (const value of values) {
          if (!dictionary.includes(`- ${value}`)) {
            failures.push(`mock-data-evaluations: ${testCase.id} value ${value} is absent from ${evaluation.dictionary}`);
          }
        }
      }
    } else {
      failures.push(`mock-data-evaluations: ${testCase.id} has unknown kind ${testCase.kind}`);
    }
  }
  return evaluation.cases.length;
}

function readOpenApiOperations(path) {
  const source = readRepositoryFile(path);
  const pathsSection = source.match(/^paths:\s*\r?\n([\s\S]*?)(?=^components:\s*$)/m)?.[1];
  if (!pathsSection) throw new Error(`${path} has no paths section`);

  const operations = new Set();
  let currentPath;
  for (const line of pathsSection.split(/\r?\n/)) {
    const pathMatch = line.match(/^  (\/.*):\s*$/);
    if (pathMatch) {
      currentPath = pathMatch[1];
      continue;
    }
    const methodMatch = line.match(/^    (get|put|post|delete|options|head|patch|trace):\s*$/i);
    if (currentPath && methodMatch) operations.add(`${methodMatch[1].toLowerCase()} ${currentPath}`);
  }
  return operations;
}

function checkLegacyCollections() {
  const allowedOperations = new Set([
    ...readOpenApiOperations('demo/openapi.yaml'),
    ...readOpenApiOperations('demo/stateful/openapi.yaml'),
  ]);
  const actualOperations = [];
  const normalizePath = (path) => path
    .replace(/\{\{[^}]+\}\}/g, '{}')
    .replace(/\{[^}]+\}/g, '{}');
  const validateRequest = (method, rawUrl, source) => {
    try {
      const url = rawUrl.replace(/^\{\{[^}]+\}\}/, 'http://localhost')
        .replace(/\{\{[^}]+\}\}/g, 'sample');
      const route = `${method.toLowerCase()} ${new URL(url).pathname}`;
      actualOperations.push(route);
      const [actualMethod, actualPath] = route.split(' ');
      const actualSegments = actualPath.split('/');
      const declared = [...allowedOperations].some((operation) => {
        const [expectedMethod, expectedPath] = operation.split(' ');
        const expectedSegments = normalizePath(expectedPath).split('/');
        return expectedMethod === actualMethod
          && expectedSegments.length === actualSegments.length
          && expectedSegments.every((segment, index) => segment === '{}' || segment === actualSegments[index]);
      });
      if (!declared) failures.push(`legacy-collections: ${source} uses undeclared operation ${route}`);
    } catch (error) {
      failures.push(`legacy-collections: invalid URL in ${source}: ${error.message}`);
    }
  };

  const postman = JSON.parse(readRepositoryFile('legacy/postman/oas-polycontract.postman_collection.json'));
  const visitPostmanItems = (items, parent = postman.info.name) => {
    for (const item of items ?? []) {
      const source = `${parent}/${item.name}`;
      if (item.request) {
        const rawUrl = typeof item.request.url === 'string' ? item.request.url : item.request.url?.raw;
        if (!rawUrl) failures.push(`legacy-collections: ${source} has no URL`);
        else validateRequest(item.request.method, rawUrl, source);
      } else {
        visitPostmanItems(item.item, source);
      }
    }
  };
  visitPostmanItems(postman.item);
  if (!JSON.stringify(postman).includes("pm.collectionVariables.set('orderId'")) {
    failures.push('legacy-collections: Postman order creation does not pass its response ID to later requests');
  }

  const brunoRequests = [
    'legacy/bruno/Product API/Health.bru',
    'legacy/bruno/Product API/Get product by SKU.bru',
    'legacy/bruno/Stateful Order API/Health.bru',
    'legacy/bruno/Stateful Order API/Create order.bru',
    'legacy/bruno/Stateful Order API/Read created order.bru',
    'legacy/bruno/Stateful Order API/Confirm order.bru',
    'legacy/bruno/Stateful Order API/Delete order.bru',
    'legacy/bruno/Stateful Order API/Verify deleted order.bru',
  ];
  let orderCreation = '';
  for (const path of brunoRequests) {
    const request = readRepositoryFile(path);
    const match = request.match(/^(get|put|post|delete|patch|head|options|trace)\s*\{([\s\S]*?)^\}/mi);
    const url = match?.[2].match(/^\s*url:\s*(\S+)\s*$/mi)?.[1];
    if (!match || !url) failures.push(`legacy-collections: ${path} has no supported HTTP request`);
    else validateRequest(match[1], url, path);
    if (path.endsWith('Create order.bru')) orderCreation = request;
  }
  if (!orderCreation.includes('script:post-response') || !orderCreation.includes('bru.setVar("orderId", res.getBody().id)')) {
    failures.push('legacy-collections: Bruno order creation does not pass its response ID to later requests');
  }
  if (actualOperations.length !== 16) failures.push(`legacy-collections: expected 16 collection requests, found ${actualOperations.length}`);
  if (!readRepositoryFile('legacy/postman/local.postman_environment.json').includes('http://localhost:8083')) {
    failures.push('legacy-collections: Postman local environment does not point to the host Order API port');
  }
  return actualOperations.length;
}

function checkTestRoleMap() {
  const readme = readRepositoryFile('README.md');
  const clientGuide = readRepositoryFile('clients/README.md');
  const showcase = readRepositoryFile('docs/project-flow.html');
  const pipeline = readRepositoryFile('pipeline/run.mjs');
  const runner = readRepositoryFile('run.sh');
  const playwrightPackage = readRepositoryFile('clients/playwright/package.json');
  const schemathesisConfig = readRepositoryFile('demo/schemathesis.toml');
  const documentedTerms = [
    'OAS',
    'AsyncAPI',
    'Specification',
    'Contract',
    'Provider contract test',
    'Consumer contract test',
    'Smart Mock',
    'API integration test',
    'Schema validation',
    'Stateless fuzzing',
    'Stateful testing',
    'Quality gate',
  ];
  const targets = [
    "'--testBaseURL=http://app:8080'",
    "command: ['mock', '/repo/demo/openapi.yaml']",
    "MOCK_URL: 'http://specmatic-mock:9000'",
    "API_BASE_URL: 'http://app:8080'",
    "API_BASE_URL: 'http://specmatic-mock:9000'",
    "STATEFUL_API_BASE_URL: 'http://stateful-app:8082'",
    "'node', 'tests/wiremock.integration.mjs'",
  ];
  const visualLabels = [
    'Provider contract test',
    'Consumer contract test',
    'API integration',
    'app:8080',
    'specmatic-mock:9000',
    'stateful-app:8082',
  ];
  const documentedSections = ['### Contract-based testing', '### API integration testing'];
  const clientTestSources = [
    'js/consumer-contract.test.mjs',
    'playwright/consumer-contract.spec.mjs',
    'rust/tests/api_integration_test.rs',
    'go/product_api_integration_test.go',
    'python/test_product_api_integration.py',
    'js/product-api-integration.test.mjs',
    'ts/product-api-integration.test.ts',
    'java/src/test/java/nl/shiftleft/ProductApiIntegrationTest.java',
    'csharp/ProductApiIntegrationTests.cs',
    'go/stateful_order_api_integration_test.go',
    'python/test_stateful_order_api_integration.py',
    'js/stateful-order-api-integration.test.mjs',
    'ts/stateful-order-api-integration.test.ts',
    'java/src/test/java/nl/shiftleft/StatefulOrderApiIntegrationTest.java',
    'csharp/StatefulOrderApiIntegrationTests.cs',
    'playwright/product-api-integration.spec.mjs',
  ];
  const testCommands = [
    '${name} API integration suite',
    'JavaScript consumer contract tests',
    'Playwright consumer contract tests',
  ];
  for (const term of documentedTerms) {
    if (!readme.includes(`| ${term} |`)) failures.push(`test-role-map: README glossary omits ${term}`);
  }
  for (const section of documentedSections) {
    if (!readme.includes(section)) failures.push(`test-role-map: README omits the ${section} section`);
  }
  if (!clientGuide.includes('../README.md#testing-model-and-terminology')) {
    failures.push('test-role-map: client guide must link to the canonical testing model');
  }
  for (const source of clientTestSources) {
    if (!clientGuide.includes(`(${source})`)) failures.push(`test-role-map: client guide does not link the implemented test source ${source}`);
  }
  for (const target of targets) {
    if (!pipeline.includes(target)) failures.push(`test-role-map: Testcontainers target is missing or changed: ${target}`);
  }
  if (!pipeline.includes('/repo/demo/schemathesis.toml')) failures.push('test-role-map: Testcontainers does not load the Product API Schemathesis configuration');
  if (!schemathesisConfig.includes('include-name = "GET /products/{sku}"')
      || !schemathesisConfig.includes('["2xx", "3xx", "4xx", "502"]')) {
    failures.push('test-role-map: Schemathesis must allow only the documented 502 on the Product lookup operation');
  }
  for (const command of testCommands) {
    if (!pipeline.includes(command) && !runner.includes(command) && !playwrightPackage.includes(command)) {
      failures.push(`test-role-map: implemented test structure is not wired to the documented role: ${command}`);
    }
  }
  for (const label of visualLabels) {
    if (!showcase.includes(label)) failures.push(`test-role-map: interactive overview omits ${label}`);
  }
  return documentedTerms.length + targets.length + visualLabels.length + documentedSections.length + clientTestSources.length + testCommands.length;
}

function checkPipelineTasks(tasks) {
  const pipeline = readRepositoryFile('pipeline/run.mjs');
  for (const task of tasks) {
    if (!pipeline.includes(task)) failures.push(`pipeline-coverage: Testcontainers task is missing: ${task}`);
  }
  return tasks.length;
}

function checkTestcontainersSafety() {
  const pipeline = readRepositoryFile('pipeline/run.mjs');
  const packageJson = JSON.parse(readRepositoryFile('pipeline/package.json'));
  const composeExists = existsSync(resolve(repositoryRoot, 'docker-compose.yml'));
  const required = [
    [!composeExists, 'Docker Compose orchestration should be removed'],
    [pipeline.includes('const readOnlyMount') && pipeline.includes("mode: 'ro'") && !pipeline.includes("source: repositoryRoot") && !pipeline.includes("target: '/repo'"), 'only selected source paths may be mounted read-only'],
    [pipeline.includes("readOnlyMount('demo')") && pipeline.includes("readOnlyMount('openapi')"), 'contract and fixture mounts must be explicit'],
    [pipeline.includes('PullPolicy.neverPull()'), 'local project images must never be pulled from a registry'],
    [pipeline.includes('.withNetwork(this.network)') && pipeline.includes('.withNetworkAliases(alias)'), 'service containers must use the isolated Testcontainers network'],
    [!pipeline.includes('withExposedPorts('), 'pipeline containers must not publish host ports'],
    [typeof packageJson.devDependencies?.testcontainers === 'string', 'Testcontainers dependency must be pinned'],
  ];
  for (const [passed, message] of required) if (!passed) failures.push(`testcontainers-safety: ${message}`);
  return required.length;
}

function checkDependencyLocks() {
  const cargoLock = readRepositoryFile('clients/rust/Cargo.lock');
  const goSum = readRepositoryFile('clients/go/go.sum');
  const goMod = readRepositoryFile('clients/go/go.mod');
  const nugetLock = JSON.parse(readRepositoryFile('clients/csharp/packages.lock.json'));
  const rustDockerfile = readRepositoryFile('clients/rust/Dockerfile');
  const goDockerfile = readRepositoryFile('clients/go/Dockerfile');
  const csharpDockerfile = readRepositoryFile('clients/csharp/Dockerfile');
  const csharpProject = readRepositoryFile('clients/csharp/ContractTests.csproj');
  const versions = readRepositoryFile('.github/versions.env');
  const tsPackage = JSON.parse(readRepositoryFile('clients/ts/package.json'));
  const tsLock = JSON.parse(readRepositoryFile('clients/ts/package-lock.json'));
  const tsDockerfile = readRepositoryFile('clients/ts/Dockerfile');
  const tsTests = tsPackage.scripts?.test ?? '';
  const pipelinePackage = JSON.parse(readRepositoryFile('pipeline/package.json'));
  const pipelineLock = JSON.parse(readRepositoryFile('pipeline/package-lock.json'));
  const pipeline = readRepositoryFile('pipeline/run.mjs');
  const clientBuildArgs = [...pipeline.matchAll(/args: \[([^\]]+)\]/g)]
    .flatMap(([, args]) => [...args.matchAll(/'([A-Z][A-Z0-9_]*)'/g)].map(([, key]) => key));
  const required = [
    [cargoLock.includes('version = 4') && cargoLock.includes('name = "reqwest"\nversion = "0.13.5"'), 'Rust lockfile must record reqwest 0.13.5'],
    [rustDockerfile.includes('cargo fetch --locked') && rustDockerfile.includes('"test", "--locked"'), 'Rust image must fetch and test with --locked'],
    [/^github\.com\/getkin\/kin-openapi v0\.153\.0 h1:/m.test(goSum), 'Go checksum must record kin-openapi 0.153.0'],
    [[
      'github.com/go-openapi/jsonpointer v0.22.5 // indirect',
      'github.com/go-openapi/swag/jsonname v0.25.5 // indirect',
      'github.com/gorilla/mux v1.8.0 // indirect',
      'github.com/santhosh-tekuri/jsonschema/v6 v6.0.3 // indirect',
      'go.yaml.in/yaml/v4 v4.0.0 // indirect',
      'golang.org/x/text v0.41.0 // indirect',
    ].every((dependency) => goMod.includes(dependency)), 'Go module file must pin the tidied indirect requirements'],
    [goDockerfile.includes('go mod download') && goDockerfile.includes('"-mod=readonly"'), 'Go image must download modules and test read-only'],
    [Boolean(nugetLock.dependencies?.['net10.0']?.NJsonSchema?.resolved), 'NuGet lockfile must record resolved direct dependencies'],
    [csharpProject.includes('<RestorePackagesWithLockFile>true</RestorePackagesWithLockFile>') && csharpDockerfile.includes('--locked-mode') && csharpDockerfile.includes('--no-restore'), '.NET restore and test must enforce the committed lockfile'],
    [/^NPM_VERSION=\d+\.\d+\.\d+$/m.test(versions), 'NPM_VERSION must be pinned in the shared versions file'],
    [tsPackage.engines?.npm?.startsWith('>=12') && tsLock.lockfileVersion === 4, 'TypeScript patching must use npm 12 and its supported lockfile format'],
    [tsDockerfile.includes('npm@${NPM_VERSION}') && tsDockerfile.includes('USER node'), 'TypeScript image must install the pinned npm version and run as non-root'],
    [tsDockerfile.indexOf('COPY --chown=node:node patches/') < tsDockerfile.indexOf('RUN npm ci'), 'TypeScript image must copy the dependency patch before npm ci'],
    [tsTests.includes('node --test security/picomatch-redos.check.mjs') && !tsTests.includes('picomatch-redos.test.mjs'), 'The Node-only Picomatch check must stay outside Vitest discovery'],
    [pipelinePackage.devDependencies?.testcontainers === pipelineLock.packages?.['node_modules/testcontainers']?.version, 'Testcontainers version must be exact and locked'],
    [pipelinePackage.scripts?.test === 'node --test config.test.mjs' && pipeline.includes("readVersionPins(") && readRepositoryFile('run.sh').includes('npm --prefix pipeline test'), 'The local runner must test strict, required version-pin parsing before starting containers'],
    [/^TESTCONTAINERS_RYUK_VERSION=\S+$/m.test(versions) && pipeline.includes('versions.TESTCONTAINERS_RYUK_VERSION'), 'Ryuk version must come from the shared versions file'],
    [pipeline.includes('...new Set(clientImages.flatMap(({ args }) => args))') && clientBuildArgs.includes('NPM_VERSION') && pipeline.includes('args.map((key) => [key, versions[key]])'), 'Required client runtime pins must derive from the image build matrix and use the shared versions file'],
    [readRepositoryFile('run.sh').includes('npm ci --prefix pipeline'), 'The shared runner must install the locked Testcontainers dependency'],
  ];
  for (const [passed, message] of required) if (!passed) failures.push(`dependency-locks: ${message}`);
  return required.length;
}

function checkRoadmapPhases(expectedPhases, verifiedRun) {
  const roadmap = readRepositoryFile('ROADMAP.md');
  const phases = [...roadmap.matchAll(/^### Phase (\d+)\s+—/gm)].map((match) => Number(match[1]));
  if (JSON.stringify(phases) !== JSON.stringify(expectedPhases)) {
    failures.push(`roadmap-phases: expected phases ${expectedPhases.join(', ')}, found ${phases.join(', ')}`);
  }
  if (!roadmap.includes(verifiedRun)) failures.push(`roadmap-phases: verified run ${verifiedRun} is not recorded`);
  const phaseFive = roadmap.match(/^### Phase 5\s+—[\s\S]*?(?=^### Phase 6\s+—)/m)?.[0] ?? '';
  if (!phaseFive.includes('[x] Add project-specific Postman and Bruno collections')) {
    failures.push('roadmap-phases: Phase 5 must record the Postman and Bruno examples');
  }
  return phases.length;
}

function checkWorkflowVisuals() {
  const readme = readRepositoryFile('README.md');
  const showcase = readRepositoryFile('docs/project-flow.html');
  const workflowFiles = [
    '.github/workflows/contract.yml',
    '.github/workflows/security.yml',
    '.github/workflows/showcase.yml',
    '.github/workflows/performance.yml',
  ];
  const sourcePolicies = [
    {
      path: '.github/workflows/contract.yml',
      markers: ['  push:', '  pull_request:', '  workflow_dispatch:', 'actions/setup-node@', 'npm install --global npm@${NPM_VERSION}', 'node --check pipeline/run.mjs', 'PIPELINE_TIMINGS_FILE:', 'pipeline-timings.csv', 'actions/upload-artifact@', 'bash ./run.sh', 'image-ref: oas-polycontract-app:latest', 'image-ref: oas-polycontract-wiremock:latest'],
    },
    {
      path: '.github/workflows/security.yml',
      markers: ['branches: [main]', 'pull_request:', 'workflow_dispatch:', 'schedule:', 'gitleaks/gitleaks-action', 'scan-type: fs', 'scanners: vuln,misconfig', 'dependency-review-action', 'name: OWASP GenAI scan', 'Demonstrate a detected OWASP GenAI risk', 'run-genai-example.mjs', 'secureai-genai-example', 'secureai-scan@', '--fail-on high', 'upload-sarif@'],
    },
    {
      path: '.github/workflows/showcase.yml',
      markers: ['branches: [main]', 'docs/project-flow.html', 'workflow_dispatch:', 'actions/deploy-pages@'],
    },
    {
      path: '.github/workflows/performance.yml',
      markers: ['workflow_dispatch:', 'ubuntu-24.04', 'ubuntu-26.04', 'matrix.runner', 'one cold and four warm', 'RUNNER_LABEL', 'bash ./run.sh', 'summarize-performance.mjs', 'pipeline-performance-${{ matrix.runner }}', 'actions/upload-artifact@'],
    },
    {
      path: '.github/dependabot.yml',
      markers: ['interval: weekly'],
    },
  ];
  const workflowNames = ['contract.yml', 'security.yml', 'showcase.yml', 'performance.yml'];
  const concepts = ['Dependency Review', 'Dependabot', 'Trivy image scans', 'OWASP GenAI scan', 'SecureAI-Scan'];
  const readmeTriggers = [
    'Contract CI runs on pushes, pull requests, and manual dispatch.',
    'Security CI runs on pushes to `main`, pull requests, a weekly schedule, and manual dispatch.',
    'manual benchmark',
  ];
  const showcaseTriggers = ['Push · pull request · manual run', 'Main push · pull request · weekly · manual', 'Main push to showcase files · manual run', 'Manual benchmark · Ubuntu 24.04 and 26.04'];

  for (const path of workflowFiles) assertRepositoryPath(path, 'workflow-visuals');
  for (const policy of sourcePolicies) {
    const source = readRepositoryFile(policy.path);
    for (const marker of policy.markers) {
      if (!source.includes(marker)) failures.push(`workflow-visuals: ${policy.path} no longer contains ${marker}`);
    }
  }
  for (const name of workflowNames) {
    if (!readme.includes(name)) failures.push(`workflow-visuals: README does not map ${name}`);
    if (!showcase.includes(name)) failures.push(`workflow-visuals: interactive showcase does not map ${name}`);
  }
  for (const concept of concepts) {
    if (!readme.includes(concept)) failures.push(`workflow-visuals: README omits ${concept}`);
    if (!showcase.includes(concept)) failures.push(`workflow-visuals: interactive showcase omits ${concept}`);
  }
  for (const example of [
    'scan clients/js --fail-on high',
    'scan clients/ts --fail-on high',
    'scan clients/python --fail-on high',
    'CodeQL `rust`',
    'CodeQL `go`',
    'CodeQL `python`',
    'CodeQL `javascript-typescript`',
    'CodeQL `java-kotlin`',
    'CodeQL `csharp`',
  ]) {
    if (!readme.includes(example)) failures.push(`workflow-visuals: README omits language scan example ${example}`);
  }
  for (const trigger of readmeTriggers) {
    if (!readme.includes(trigger)) failures.push(`workflow-visuals: README omits trigger ${trigger}`);
  }
  for (const trigger of showcaseTriggers) {
    if (!showcase.includes(trigger)) failures.push(`workflow-visuals: interactive showcase omits trigger ${trigger}`);
  }
  if (!readme.includes('### Contract and test flow') || !readme.includes('```mermaid\nflowchart LR')) {
    failures.push('workflow-visuals: README contract and test flow diagram is missing');
  }
  const nativeSuiteBox = readme.match(/subgraph NativeSuites\["Native API suites"\]([\s\S]*?)\n  end/)?.[1] ?? '';
  for (const technology of [
    'cargo test',
    'go test',
    'pytest',
    'node:test',
    'Vitest',
    'JUnit',
    'xUnit',
  ]) {
    if (!nativeSuiteBox.includes(technology)) failures.push(`workflow-visuals: native suite box omits ${technology}`);
  }
  if (!readme.includes('### CI workflow') || !readme.includes('```mermaid\nflowchart TB')) {
    failures.push('workflow-visuals: README CI workflow diagram is missing');
  }
  for (const link of [
    'https://github.com/shoman2020/oas-polycontract#flow-overview',
    'https://github.com/shoman2020/oas-polycontract#contract-and-test-flow',
    'https://github.com/shoman2020/oas-polycontract#ci-workflow',
  ]) {
    if (!showcase.includes(link)) failures.push(`workflow-visuals: showcase does not link back to README diagram ${link}`);
  }
  for (const diagramElement of [
    'aria-label="Contract and API test flow diagram"',
    'Specmatic provider test',
    'Specmatic Smart Mock',
    'stateful-app:8082',
    'WireMock downstream service',
    'Native API suite frameworks',
    'cargo test · reqwest · jsonschema',
    'go test · net/http · kin-openapi',
    'pytest · Requests · openapi-core',
    'node:test · Fetch · @oaverify/core',
    'Vitest · Fetch · @oaverify/core',
    'JUnit · REST Assured · OpenAPI validator',
    'xUnit · HttpClient · NJsonSchema',
    'Manual API debugging',
    'localhost:8083',
  ]) {
    if (!showcase.includes(diagramElement)) failures.push(`workflow-visuals: interactive test-flow map omits ${diagramElement}`);
  }
  for (const [link, anchor] of [
    ['https://shoman2020.github.io/oas-polycontract/#contracts', 'id="contracts"'],
    ['https://shoman2020.github.io/oas-polycontract/#test-roles', 'id="test-roles"'],
    ['https://shoman2020.github.io/oas-polycontract/#test-behavior', 'id="test-behavior"'],
    ['https://shoman2020.github.io/oas-polycontract/#pipeline', 'id="pipeline"'],
    ['https://shoman2020.github.io/oas-polycontract/#workflows', 'id="workflows"'],
    ['https://shoman2020.github.io/oas-polycontract/#performance', 'id="performance"'],
  ]) {
    if (!readme.includes(link) || !showcase.includes(anchor)) failures.push(`workflow-visuals: graph link ${link} must resolve to ${anchor}`);
  }
  if (!/^SECUREAI_SCAN_VERSION=\S+$/m.test(readRepositoryFile('.github/versions.env'))) {
    failures.push('workflow-visuals: SecureAI-Scan version is not pinned');
  }
  const genaiExample = readRepositoryFile('gates/security/run-genai-example.mjs');
  for (const marker of ['SECUREAI_SCAN_VERSION', "'AI001'", "'--fail-on'", "'high'", 'GITHUB_STEP_SUMMARY']) {
    if (!genaiExample.includes(marker)) failures.push(`workflow-visuals: GenAI example omits ${marker}`);
  }
  if (!readme.includes('## Quality gates') || !readme.includes('HIGH AI001')) {
    failures.push('workflow-visuals: README must document the quality gates and verified GenAI result');
  }
  const sceneCount = [...showcase.matchAll(/<section class="scene"/g)].length;
  const laneCount = [...showcase.matchAll(/class="workflow-lane"/g)].length;
  const testFlowLaneCount = [...showcase.matchAll(/class="test-flow-lane"/g)].length;
  const workflowMapReferences = [...readme.matchAll(/https:\/\/shoman2020\.github\.io\/oas-polycontract\/#(?:contracts|test-roles|test-behavior|pipeline|workflows|performance)/g)].length;
  if (!readme.includes('```mermaid\nflowchart TB')) failures.push('workflow-visuals: README workflow diagram is missing');
  if (!readme.includes('```mermaid\nflowchart LR')) failures.push('workflow-visuals: README contract and test diagram is missing');
  if (sceneCount !== 8) failures.push(`workflow-visuals: expected 8 showcase slides, found ${sceneCount}`);
  if (laneCount !== 4) failures.push(`workflow-visuals: expected 4 workflow lanes, found ${laneCount}`);
  if (testFlowLaneCount !== 7) failures.push(`workflow-visuals: expected 7 interactive test-flow lanes, found ${testFlowLaneCount}`);
  if (workflowMapReferences < 6) failures.push(`workflow-visuals: expected 6 README links to interactive maps, found ${workflowMapReferences}`);
  if (!showcase.includes('aria-valuemax="8"')) failures.push('workflow-visuals: showcase progress range is not updated for 8 slides');
  return workflowFiles.length + sourcePolicies.length + concepts.length + readmeTriggers.length + showcaseTriggers.length + sceneCount + laneCount;
}

const evaluators = {
  'readme-links': () => checkReadmeLinks(),
  'readme-tree': () => checkReadmeTree(),
  'architecture-map': () => checkArchitectureMap(),
  'files-exist': (check) => checkFilesExist(check.paths, check.id),
  'test-role-map': () => checkTestRoleMap(),
  'mock-data-evaluations': (check) => checkMockDataEvaluations(check.file),
  'legacy-collections': () => checkLegacyCollections(),
  'pipeline-tasks': (check) => checkPipelineTasks(check.tasks),
  'testcontainers-safety': () => checkTestcontainersSafety(),
  'workflow-visuals': () => checkWorkflowVisuals(),
  'dependency-locks': () => checkDependencyLocks(),
  'roadmap-phases': (check) => checkRoadmapPhases(check.expectedPhases, check.verifiedRun),
};

for (const check of suite.checks) {
  const failuresBeforeCheck = failures.length;
  try {
    if (!evaluators[check.type]) throw new Error(`unknown evaluation type: ${check.type}`);
    const itemCount = evaluators[check.type](check);
    if (failures.length === failuresBeforeCheck) {
      results.push({ id: check.id, description: check.description, itemCount });
    }
  } catch (error) {
    failures.push(`${check.id}: ${error.message}`);
  }
}

for (const result of results) {
  console.log(`PASS ${result.id}: ${result.description} (${result.itemCount} items)`);
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  console.error(`\n${suite.name}: ${results.length}/${suite.checks.length} checks passed`);
  process.exitCode = 1;
} else {
  console.log(`\n${suite.name}: ${results.length}/${suite.checks.length} checks passed`);
}
