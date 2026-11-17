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
  const section = readme.match(/## Project structure\s+```text\s*([\s\S]*?)```/);
  if (!section) throw new Error('README project structure code block was not found');

  const parents = [];
  const paths = [];
  const treeLines = section[1].split(/\r?\n/);

  for (const line of treeLines) {
    const match = line.match(/^((?:\|   )*)(?:\|--|`--)\s+(\S+)/);
    if (!match) continue;
    const depth = match[1].length / 4;
    const name = match[2].replace(/\/$/, '');
    parents.length = depth;
    const path = [...parents, name].join('/');
    paths.push(path);
    if (match[2].endsWith('/')) parents[depth] = name;
    else parents.length = depth;
  }

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
  ];
  const sourcePolicies = [
    {
      path: '.github/workflows/contract.yml',
      markers: ['  push:', '  pull_request:', '  workflow_dispatch:', 'bash ./run.sh', 'image-ref: oas-polycontract-app:latest', 'image-ref: oas-polycontract-wiremock:latest'],
    },
    {
      path: '.github/workflows/security.yml',
      markers: ['branches: [main]', 'pull_request:', 'workflow_dispatch:', 'schedule:', 'gitleaks/gitleaks-action', 'scan-type: fs', 'scanners: vuln,misconfig', 'dependency-review-action'],
    },
    {
      path: '.github/workflows/showcase.yml',
      markers: ['branches: [main]', 'docs/project-flow.html', 'workflow_dispatch:', 'actions/deploy-pages@'],
    },
    {
      path: '.github/dependabot.yml',
      markers: ['interval: weekly'],
    },
  ];
  const workflowNames = ['contract.yml', 'security.yml', 'showcase.yml'];
  const concepts = ['Dependency Review', 'Dependabot', 'Trivy image scans'];
  const readmeTriggers = ['Push to any branch', 'Push to main', 'Pull request', 'Weekly schedule', 'Manual workflow dispatch'];
  const showcaseTriggers = ['Push · pull request · manual run', 'Main push · pull request · weekly · manual', 'Main push to showcase files · manual run'];

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
  for (const trigger of readmeTriggers) {
    if (!readme.includes(trigger)) failures.push(`workflow-visuals: README omits trigger ${trigger}`);
  }
  for (const trigger of showcaseTriggers) {
    if (!showcase.includes(trigger)) failures.push(`workflow-visuals: interactive showcase omits trigger ${trigger}`);
  }
  const sceneCount = [...showcase.matchAll(/<section class="scene"/g)].length;
  const laneCount = [...showcase.matchAll(/class="workflow-lane"/g)].length;
  if (!readme.includes('```mermaid\nflowchart TB')) failures.push('workflow-visuals: README workflow diagram is missing');
  if (sceneCount !== 8) failures.push(`workflow-visuals: expected 8 showcase slides, found ${sceneCount}`);
  if (laneCount !== 3) failures.push(`workflow-visuals: expected 3 workflow lanes, found ${laneCount}`);
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
