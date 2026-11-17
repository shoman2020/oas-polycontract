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

function checkTestRoleMap() {
  const readme = readRepositoryFile('README.md');
  const clientGuide = readRepositoryFile('clients/README.md');
  const showcase = readRepositoryFile('docs/project-flow.html');
  const compose = readRepositoryFile('docker-compose.yml');
  const runner = readRepositoryFile('run.sh');
  const playwrightPackage = readRepositoryFile('clients/playwright/package.json');
  const schemathesisConfig = readRepositoryFile('demo/schemathesis.toml');
  const documentedRoles = [
    'Provider contract-based test',
    'Consumer contract-based test',
    'Product API integration test',
    'Stateful API integration test',
    'Downstream service integration test',
  ];
  const targets = [
    'command: ["test", "openapi.yaml", "--testBaseURL=http://app:8080"]',
    'command: ["mock", "openapi.yaml"]',
    'MOCK_URL: http://specmatic-mock:9000',
    'API_BASE_URL: http://app:8080',
    'API_BASE_URL: http://specmatic-mock:9000',
    'STATEFUL_API_BASE_URL: http://stateful-app:8082',
    'command: ["node", "tests/wiremock.integration.mjs"]',
  ];
  const visualLabels = [
    'Provider contract test',
    'Consumer contract test',
    'API integration',
    'app:8080',
    'specmatic-mock:9000',
    'stateful-app:8082',
  ];
  const documentedSections = [
    { readme: '### Contract-based testing', clientGuide: '## Contract-based testing' },
    { readme: '### API integration testing', clientGuide: '## API integration testing' },
  ];
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
    'command: ["npm", "run", "test:provider"]',
    'command: ["npm", "run", "test:consumer"]',
    'run --rm js-api-integration-test',
    'run --rm js-consumer-contract-test',
    'run --rm playwright-api-integration-test',
    'run --rm playwright-consumer-contract-test',
  ];
  for (const role of documentedRoles) {
    if (!readme.includes(role)) failures.push(`test-role-map: README omits ${role}`);
    if (!clientGuide.includes(role)) failures.push(`test-role-map: client guide omits ${role}`);
  }
  for (const section of documentedSections) {
    if (!readme.includes(section.readme)) failures.push(`test-role-map: README omits the ${section.readme} section`);
    if (!clientGuide.includes(section.clientGuide)) failures.push(`test-role-map: client guide omits the ${section.clientGuide} section`);
  }
  for (const source of clientTestSources) {
    if (!clientGuide.includes(`(${source})`)) failures.push(`test-role-map: client guide does not link the implemented test source ${source}`);
  }
  for (const target of targets) {
    if (!compose.includes(target)) failures.push(`test-role-map: Compose target is missing or changed: ${target}`);
  }
  if (!compose.includes('/contracts/schemathesis.toml')) failures.push('test-role-map: Compose does not load the Product API Schemathesis configuration');
  if (!schemathesisConfig.includes('include-name = "GET /products/{sku}"')
      || !schemathesisConfig.includes('["2xx", "3xx", "4xx", "502"]')) {
    failures.push('test-role-map: Schemathesis must allow only the documented 502 on the Product lookup operation');
  }
  for (const command of testCommands) {
    if (!compose.includes(command) && !runner.includes(command) && !playwrightPackage.includes(command)) {
      failures.push(`test-role-map: implemented test structure is not wired to the documented role: ${command}`);
    }
  }
  for (const label of visualLabels) {
    if (!showcase.includes(label)) failures.push(`test-role-map: interactive overview omits ${label}`);
  }
  return documentedRoles.length + targets.length + visualLabels.length + documentedSections.length + clientTestSources.length + testCommands.length;
}

function checkPipelineServices(services) {
  const compose = readRepositoryFile('docker-compose.yml');
  const runner = readRepositoryFile('run.sh');
  const composeServices = new Set([...compose.matchAll(/^  ([a-z0-9-]+):\s*$/gm)].map((match) => match[1]));

  for (const service of services) {
    if (!composeServices.has(service)) failures.push(`pipeline-coverage: ${service} is not defined in docker-compose.yml`);
    if (!runner.includes(service)) failures.push(`pipeline-coverage: ${service} is not invoked by run.sh`);
  }
  return services.length;
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
      markers: ['  push:', '  pull_request:', '  workflow_dispatch:', 'PIPELINE_TIMINGS_FILE:', 'pipeline-timings.csv', 'actions/upload-artifact@', 'bash ./run.sh', 'image-ref: oas-polycontract-app:latest', 'image-ref: oas-polycontract-wiremock:latest'],
    },
    {
      path: '.github/workflows/security.yml',
      markers: ['branches: [main]', 'pull_request:', 'workflow_dispatch:', 'schedule:', 'gitleaks/gitleaks-action', 'scan-type: fs', 'scanners: vuln,misconfig', 'dependency-review-action', 'name: OWASP GenAI scan', 'secureai-scan@', '--fail-on high', 'upload-sarif@'],
    },
    {
      path: '.github/workflows/showcase.yml',
      markers: ['branches: [main]', 'docs/project-flow.html', 'workflow_dispatch:', 'actions/deploy-pages@'],
    },
    {
      path: '.github/workflows/performance.yml',
      markers: ['workflow_dispatch:', 'one cold and four warm', 'bash ./run.sh', 'summarize-performance.mjs', 'actions/upload-artifact@'],
    },
    {
      path: '.github/dependabot.yml',
      markers: ['interval: weekly'],
    },
  ];
  const workflowNames = ['contract.yml', 'security.yml', 'showcase.yml', 'performance.yml'];
  const concepts = ['Dependency Review', 'Dependabot', 'Trivy image scans', 'OWASP GenAI scan', 'SecureAI-Scan'];
  const readmeTriggers = ['Push to any branch', 'Push to main', 'Pull request', 'Weekly schedule', 'Manual workflow dispatch', 'Manual performance sampling'];
  const showcaseTriggers = ['Push · pull request · manual run', 'Main push · pull request · weekly · manual', 'Main push to showcase files · manual run', 'Manual five-run benchmark'];

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
  const sceneCount = [...showcase.matchAll(/<section class="scene"/g)].length;
  const laneCount = [...showcase.matchAll(/class="workflow-lane"/g)].length;
  const testFlowLaneCount = [...showcase.matchAll(/class="test-flow-lane"/g)].length;
  const workflowMapReferences = [...readme.matchAll(/https:\/\/shoman2020\.github\.io\/oas-polycontract\/#(?:contracts|test-roles|test-behavior|pipeline|workflows|performance)/g)].length;
  if (!readme.includes('```mermaid\nflowchart TB')) failures.push('workflow-visuals: README workflow diagram is missing');
  if (!readme.includes('```mermaid\nflowchart LR')) failures.push('workflow-visuals: README contract and test diagram is missing');
  if (sceneCount !== 8) failures.push(`workflow-visuals: expected 8 showcase slides, found ${sceneCount}`);
  if (laneCount !== 4) failures.push(`workflow-visuals: expected 4 workflow lanes, found ${laneCount}`);
  if (testFlowLaneCount !== 5) failures.push(`workflow-visuals: expected 5 interactive test-flow lanes, found ${testFlowLaneCount}`);
  if (workflowMapReferences < 6) failures.push(`workflow-visuals: expected 6 README links to interactive maps, found ${workflowMapReferences}`);
  if (!showcase.includes('aria-valuemax="8"')) failures.push('workflow-visuals: showcase progress range is not updated for 8 slides');
  return workflowFiles.length + sourcePolicies.length + concepts.length + readmeTriggers.length + showcaseTriggers.length + sceneCount + laneCount;
}

const evaluators = {
  'readme-links': () => checkReadmeLinks(),
  'readme-tree': () => checkReadmeTree(),
  'files-exist': (check) => checkFilesExist(check.paths, check.id),
  'test-role-map': () => checkTestRoleMap(),
  'mock-data-evaluations': (check) => checkMockDataEvaluations(check.file),
  'pipeline-services': (check) => checkPipelineServices(check.services),
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
