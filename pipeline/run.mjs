import { createHash } from 'node:crypto';
import { closeSync, fstatSync, mkdirSync, mkdtempSync, openSync, readSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { parseNativeClientSelection, readVersionPins } from './config.mjs';
import { completeStageReport } from './stage-report.mjs';
import { runChildProcess } from './commands.mjs';

const repositoryRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));

const readOnlyMount = (path, target = `/repo/${path}`) => ({
  source: join(repositoryRoot, path),
  target,
  mode: 'ro',
});

const contractMounts = [
  readOnlyMount('demo'),
  readOnlyMount('openapi'),
  readOnlyMount('contracts'),
  readOnlyMount('gates/lint'),
];

const nativeClientKeys = ['rust', 'go', 'python', 'js', 'ts', 'java', 'csharp', 'playwright'];
const pipelineProfile = (process.env.POLYCONTRACT_PIPELINE_PROFILE ?? 'full').trim().toLowerCase();
const supportedPipelineProfiles = new Set(['full', 'core', 'native']);
if (!supportedPipelineProfiles.has(pipelineProfile)) {
  throw new Error(`Unsupported pipeline profile '${pipelineProfile}'; choose from ${[...supportedPipelineProfiles].join(', ')}`);
}
const selectedNativeClients = new Set(parseNativeClientSelection(process.env.POLYCONTRACT_NATIVE_CLIENTS, nativeClientKeys));

const versions = readVersionPins(join(repositoryRoot, '.github/versions.env'), [
  'OASDIFF_VERSION',
  'SCHEMATHESIS_VERSION',
  'SPECMATIC_VERSION',
  'SPECTRAL_VERSION',
  'TESTCONTAINERS_RYUK_VERSION',
  'NODE_TEST_IMAGE',
  'WIREMOCK_VERSION',
  'WIREMOCK_RUNTIME_IMAGE',
  'WIREMOCK_SHA256',
  'RUST_VERSION',
  'GO_VERSION',
  'PYTHON_VERSION',
  'NODE_VERSION',
  'NPM_VERSION',
  'MAVEN_VERSION',
  'JAVA_VERSION',
  'DOTNET_VERSION',
]);

process.env.RYUK_CONTAINER_IMAGE = `testcontainers/ryuk:${versions.TESTCONTAINERS_RYUK_VERSION}`;
const { GenericContainer, Network, Wait } = await import('testcontainers');
const nodeAlpine = `node:${versions.NODE_VERSION}-alpine`;
const nodeTestImage = `${versions.NODE_TEST_IMAGE}:${versions.NODE_VERSION}-npm${versions.NPM_VERSION}`;
const runtimeImages = {
  app: nodeTestImage,
  stateful: nodeTestImage,
  wiremock: versions.WIREMOCK_RUNTIME_IMAGE,
  rust: `rust:${versions.RUST_VERSION}-bookworm`,
  go: `golang:${versions.GO_VERSION}-alpine`,
  python: `python:${versions.PYTHON_VERSION}-slim`,
  js: nodeTestImage,
  ts: nodeTestImage,
  playwright: `node:${versions.NODE_VERSION}-bookworm-slim`,
  java: `maven:${versions.MAVEN_VERSION}-eclipse-temurin-${versions.JAVA_VERSION}`,
  csharp: `mcr.microsoft.com/dotnet/sdk:${versions.DOTNET_VERSION}`,
};

const serviceHealthCheck = (port) => ({
  test: ['CMD', 'node', '-e', `fetch('http://127.0.0.1:${port}/healthz').then(response => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))`],
  interval: 5000,
  timeout: 3000,
  retries: 10,
  startPeriod: 2000,
});

class ContractPipeline {
  constructor() {
    this.network = undefined;
    this.services = [];
    this.stages = [];
    this.plannedStages = [];
    this.stageName = undefined;
    this.stageStart = 0;
    this.startedAt = Date.now();
  }

  async run() {
    const runtimeStages = [
      ['Testcontainers network', async () => {
        this.network = await new Network().start();
      }],
      ['Prepare pinned Node test runtime', () => this.prepareNodeTestImage()],
    ];
    const contractPlan = [
      ...runtimeStages,
      ['Repository evaluations', () => this.runEvaluations()],
      ['API behavior unit tests', () => this.runServiceUnitTests()],
      ['Contract lint', () => this.runContractLint()],
      ['Compatibility', () => this.runOasDiff()],
      ['Negative contract canaries', () => this.runNegativeCanaries()],
      ['Provider and downstream contract tests', () => this.runProviderTests()],
      ['Stateless fuzzing', () => this.runStatelessFuzzing()],
      ['Stateful API tests', () => this.runStatefulTests()],
      ['Native API integration suites', () => this.runNativeSuites()],
      ['BDD acceptance features', () => this.runBddFeatures()],
      ['Consumer mock checks and evaluations', () => this.runConsumerTests()],
    ];
    const nativePlan = [
      ...runtimeStages,
      ['Start API integration services', () => this.startApiIntegrationServices()],
      ['Native API integration suites', () => this.runNativeSuites()],
    ];
    const plan = pipelineProfile === 'native'
      ? nativePlan
      : pipelineProfile === 'core'
        ? contractPlan.filter(([name]) => name !== 'Native API integration suites')
        : contractPlan;
    this.plannedStages = plan.map(([name]) => name);

    let failure;
    try {
      for (const [name, operation] of plan) await this.stage(name, operation);
      console.log(`==> Contract ${pipelineProfile} pipeline passed`);
    } catch (error) {
      failure = error;
      console.error(error);
    } finally {
      await this.cleanup();
      this.writeTimingReport(failure ? 'failed' : 'passed');
    }

    if (failure) throw failure;
  }

  async stage(name, operation) {
    this.stageName = name;
    this.stageStart = Date.now();
    console.log(`==> ${name}`);
    let result = 'passed';
    try {
      await operation();
    } catch (error) {
      result = 'failed';
      throw error;
    } finally {
      this.stages.push({
        name,
        seconds: Math.round((Date.now() - this.stageStart) / 1000),
        result,
      });
      this.stageName = undefined;
    }
  }

  async runEvaluations() {
    const result = await runChildProcess(process.execPath, [join(repositoryRoot, 'evals/run.mjs')], {
      cwd: repositoryRoot,
      stdio: 'inherit',
    });
    if (result.exitCode !== 0) {
      throw new Error(`Repository evaluations exited with ${result.exitCode ?? result.signal}`);
    }
  }

  createContainer(image, options = {}) {
    const { alias } = options;
    const isService = Boolean(alias);
    let container = new GenericContainer(image)
      .withNetwork(this.network)
      .withStartupTimeout(options.timeout ?? (isService ? 120_000 : 60 * 60 * 1000))
      .withLogConsumer((stream) => {
        stream.on('data', (line) => process.stdout.write(line));
        stream.on('err', (line) => process.stderr.write(line));
      });

    if (alias) container = container.withNetworkAliases(alias);

    if (options.waitStrategy) {
      container = container.withWaitStrategy(options.waitStrategy);
    } else if (options.healthCheck) {
      container = container
        .withHealthCheck(options.healthCheck)
        .withWaitStrategy(Wait.forHealthCheck());
    } else if (isService) {
      container = container.withWaitStrategy(Wait.forSuccessfulCommand('true'));
    } else {
      container = container.withWaitStrategy(Wait.forOneShotStartup());
    }

    if (options.workingDir) container = container.withWorkingDir(options.workingDir);
    if (options.entrypoint) container = container.withEntrypoint(options.entrypoint);
    if (options.environment) container = container.withEnvironment(options.environment);
    if (options.user) container = container.withUser(options.user);
    if (options.command) container = container.withCommand(options.command);
    if (options.mounts) container = container.withBindMounts(options.mounts);
    if (options.copyFiles) container = container.withCopyFilesToContainer(options.copyFiles);
    return container;
  }

  commandContainer(image, options = {}) {
    return this.createContainer(image, options);
  }

  async runTask(name, image, options = {}) {
    console.log(`  -> ${name}`);
    const container = this.commandContainer(image, options);
    const completed = await container.start();
    await completed.stop().catch((error) => console.warn(`Container cleanup for ${name}: ${error.message}`));
  }

  async prepareNodeTestImage() {
    const marker = '__POLYCONTRACT_NODE_RUNTIME_READY__';
    const npmCacheDirectory = '/tmp/oas-polycontract-npm-cache';
    const preparation = this.createContainer(nodeAlpine, {
      timeout: 300_000,
      waitStrategy: Wait.forLogMessage(new RegExp(marker), 1),
    })
      .withEntrypoint(['/bin/sh', '-c'])
      .withCommand([
        `npm install --global npm@${versions.NPM_VERSION} --no-audit --no-fund --cache=${npmCacheDirectory} && `
          + `test "$(npm --version)" = "${versions.NPM_VERSION}" && `
          + `rm -rf ${npmCacheDirectory} && echo ${marker} && sleep infinity`,
      ]);

    const started = await preparation.start();
    try {
      await started.commit({
        repo: versions.NODE_TEST_IMAGE,
        tag: `${versions.NODE_VERSION}-npm${versions.NPM_VERSION}`,
        comment: `Node ${versions.NODE_VERSION} with npm ${versions.NPM_VERSION}`,
      });
      if (process.env.NODE_TEST_IMAGE_ARCHIVE) {
        const archivePath = resolve(process.env.NODE_TEST_IMAGE_ARCHIVE);
        mkdirSync(dirname(archivePath), { recursive: true });
        const exportedImage = await runChildProcess('docker', [
          'image', 'save', '--output', archivePath, nodeTestImage,
        ], { stdio: 'inherit' });
        if (exportedImage.exitCode !== 0) {
          const result = exportedImage.signal ? `signal ${exportedImage.signal}` : `exit code ${exportedImage.exitCode}`;
          throw new Error(`Could not export prepared Node image (docker image save: ${result})`);
        }
        console.log(`  <- Exported ${nodeTestImage} to ${archivePath}`);
      }
      console.log(`  <- Prepared ${nodeTestImage}`);
    } finally {
      await started.stop().catch((error) => console.warn(`Node test image cleanup: ${error.message}`));
    }
  }

  async runExpectedFailure(name, image, options, { command, outputPattern }) {
    const script = [
      'set +e',
      `output=$(${command} 2>&1)`,
      'status=$?',
      'printf "%s\\n" "$output"',
      'printf "__POLYCONTRACT_EXIT_CODE=%s\\n" "$status"',
      'if [ "$status" -eq 0 ]; then exit 97; fi',
      `printf "%s" "$output" | grep -Eiq '${outputPattern}'`,
    ].join('\n');
    await this.runTask(name, image, {
      ...options,
      entrypoint: ['/bin/sh', '-c'],
      command: [script],
    });
    console.log(`  <- ${name}: confirmed non-zero exit with expected failure output`);
  }

  async startService(image, alias, options = {}) {
    const container = this.createContainer(image, { ...options, alias });
    const started = await container.start();
    this.services.push(started);
    return started;
  }

  async wireMockArtifactPath() {
    const artifactName = `wiremock-standalone-${versions.WIREMOCK_VERSION}.jar`;
    const cacheDirectory = mkdtempSync(join(tmpdir(), 'oas-polycontract-'));
    const artifactPath = join(cacheDirectory, artifactName);
    const digest = (content) => createHash('sha256').update(content).digest('hex');
    const artifactUrl = `https://repo.maven.apache.org/maven2/org/wiremock/wiremock-standalone/${versions.WIREMOCK_VERSION}/${artifactName}`;
    let descriptor;
    let retainArtifact = false;
    try {
      descriptor = openSync(artifactPath, 'wx+', 0o600);
      const download = await runChildProcess('curl', [
        '--fail', '--silent', '--show-error', '--location', '--retry', '3',
        '--proto', '=https', '--proto-redir', '=https', '--connect-timeout', '15', '--max-time', '60', '--retry-max-time', '90', '--max-filesize', '33554432', artifactUrl,
      ], { stdio: ['ignore', descriptor, 'pipe'] });
      if (download.exitCode !== 0) {
        const detail = download.stderr.trim();
        const result = download.signal ? `signal ${download.signal}` : `exit code ${download.exitCode}`;
        throw new Error(`WireMock download failed${detail ? `: ${detail}` : ` with ${result}`}`);
      }

      const { size } = fstatSync(descriptor);
      if (size === 0 || size > 33_554_432) throw new Error(`WireMock artifact size is invalid: ${size} bytes`);
      const content = Buffer.alloc(size);
      let offset = 0;
      while (offset < size) {
        const bytesRead = readSync(descriptor, content, offset, size - offset, offset);
        if (bytesRead === 0) throw new Error('WireMock artifact download was incomplete');
        offset += bytesRead;
      }
      if (digest(content) !== versions.WIREMOCK_SHA256) {
        throw new Error(`WireMock ${versions.WIREMOCK_VERSION} SHA-256 did not match the pinned value`);
      }
      retainArtifact = true;
      return artifactPath;
    } finally {
      if (descriptor !== undefined) closeSync(descriptor);
      if (!retainArtifact) rmSync(cacheDirectory, { recursive: true, force: true });
    }
  }

  async startWireMock() {
    const artifactPath = await this.wireMockArtifactPath();
    try {
      const wireMock = await this.startService(runtimeImages.wiremock, 'wiremock', {
        command: ['/tmp/wiremock-standalone.jar', '--root-dir', '/home/wiremock', '--global-response-templating'],
        mounts: [{
          source: join(repositoryRoot, 'demo/downstream/wiremock'),
          target: '/home/wiremock',
          mode: 'ro',
        }],
        copyFiles: [{ source: artifactPath, target: '/tmp/wiremock-standalone.jar', mode: 0o444 }],
        waitStrategy: Wait.forLogMessage(/version:\s+\d+\.\d+\.\d+/, 1),
      });
      await this.waitForHttp('WireMock readiness', 'http://wiremock:8080/__admin/mappings');
      return wireMock;
    } finally {
      rmSync(dirname(artifactPath), { recursive: true, force: true });
    }
  }

  async waitForHttp(name, url) {
    const script = [
      'const deadline = Date.now() + 90000;',
      'while (Date.now() < deadline) {',
      '  try {',
      '    const response = await fetch(process.env.READINESS_URL, { signal: AbortSignal.timeout(2000) });',
      '    if (response.ok) process.exit(0);',
      '  } catch {}',
      '  await new Promise((resolve) => setTimeout(resolve, 500));',
      '}',
      'console.error(`Service did not become ready: ${process.env.READINESS_URL}`);',
      'process.exit(1);',
    ].join('\n');
    await this.runTask(name, runtimeImages.app, {
      entrypoint: ['node', '--input-type=module', '-e'],
      command: [script],
      user: 'node',
      environment: { READINESS_URL: url },
    });
  }

  async startProductApi() {
    return this.startService(runtimeImages.app, 'app', {
      entrypoint: ['node', '/repo/demo/app/server.mjs'],
      command: [],
      user: 'node',
      environment: {
        INVENTORY_URL: 'http://wiremock:8080',
        PORT: '8080',
      },
      healthCheck: serviceHealthCheck(8080),
      mounts: [readOnlyMount('demo/app')],
    });
  }

  async startStatefulApi() {
    return this.startService(runtimeImages.stateful, 'stateful-app', {
      entrypoint: ['node', '/repo/demo/stateful/server.mjs'],
      command: [],
      user: 'node',
      environment: { PORT: '8082' },
      healthCheck: serviceHealthCheck(8082),
      mounts: [readOnlyMount('demo/stateful')],
    });
  }

  async runContractLint() {
    const spectralImage = `stoplight/spectral:${versions.SPECTRAL_VERSION}`;
    const lint = (files, ruleset, mounts) => this.runTask('Spectral lint', spectralImage, {
      entrypoint: ['/bin/sh', '-c'],
      command: [`sh /repo/gates/lint/run-spectral.sh lint --ruleset /repo/gates/lint/${ruleset} ${files.map((file) => `/repo/${file}`).join(' ')}`],
      mounts,
    });

    await lint([
      'openapi/openapi.yaml',
      'demo/openapi.yaml',
      'demo/stateful/openapi.yaml',
      'demo/downstream/openapi.yaml',
    ], '.spectral.yaml', contractMounts);
    await lint([
      'contracts/events/websocket.asyncapi.yaml',
      'contracts/events/kafka.asyncapi.yaml',
    ], '.spectral-asyncapi.yaml', contractMounts);
  }

  async runServiceUnitTests() {
    await this.runTask('API behavior unit tests', runtimeImages.app, {
      entrypoint: ['node', '--test'],
      command: [
        '/repo/demo/app/tests/server.test.mjs',
        '/repo/demo/stateful/server.test.mjs',
      ],
      user: 'node',
      mounts: [readOnlyMount('demo')],
    });
  }

  async runOasDiff() {
    const baselineChecks = [
      ['Product', '/repo/contracts/baselines/product.openapi.yaml', '/repo/demo/openapi.yaml'],
      ['Order', '/repo/contracts/baselines/order.openapi.yaml', '/repo/demo/stateful/openapi.yaml'],
      ['Inventory', '/repo/contracts/baselines/inventory.openapi.yaml', '/repo/demo/downstream/openapi.yaml'],
    ];
    for (const [service, baseline, candidate] of baselineChecks) {
      await this.runTask(`OpenAPI compatibility: ${service}`, `tufin/oasdiff:v${versions.OASDIFF_VERSION}`, {
        command: ['breaking', baseline, candidate],
        mounts: [readOnlyMount('contracts/baselines'), readOnlyMount('demo')],
      });
    }
  }

  async runNegativeCanaries() {
    await this.startService(runtimeImages.app, 'broken-provider', {
      entrypoint: ['node', '/repo/demo/canary/broken-provider.mjs'],
      command: [],
      user: 'node',
      mounts: [readOnlyMount('demo/canary')],
      healthCheck: serviceHealthCheck(8080),
    });

    await this.runTask('Validate broken-provider canary fixture', runtimeImages.app, {
      entrypoint: ['node', '-e'],
      command: ["fetch('http://broken-provider:8080/products/demo-sku').then(async r => { const b = await r.json(); process.exit(r.status === 200 && typeof b.available === 'string' ? 0 : 1); }).catch(() => process.exit(1))"],
    });

    await this.runExpectedFailure(
      'Specmatic rejects broken Product provider',
      `specmatic/specmatic:${versions.SPECMATIC_VERSION}`,
      {
        workingDir: '/tmp',
        mounts: [readOnlyMount('demo')],
      },
      {
        command: 'specmatic test /repo/demo/openapi.yaml --testBaseURL=http://broken-provider:8080',
        outputPattern: 'available.{0,100}string|string.{0,100}available|schema.{0,100}(fail|mismatch)|response.{0,100}(fail|mismatch)',
      },
    );

    await this.runExpectedFailure(
      'JavaScript OAS validator rejects broken Product provider',
      runtimeImages.js,
      {
        user: 'node',
        environment: {
          API_BASE_URL: 'http://broken-provider:8080',
          OPENAPI_SPEC: '/repo/demo/openapi.yaml',
          FEATURE_CASES_PATH: '/repo/clients/shared/acceptance-cases.json',
          CLIENT_SOURCE: '/repo/clients/js',
          CLIENT_SUITE: 'js-canary',
          NPM_VERSION: versions.NPM_VERSION,
        },
        mounts: [
          readOnlyMount('demo'),
          readOnlyMount('clients/js'),
          readOnlyMount('clients/shared'),
          readOnlyMount('pipeline/client-suite.sh'),
        ],
      },
      {
        command: 'sh /repo/pipeline/client-suite.sh',
        outputPattern: 'ERR_ASSERTION|AssertionError',
      },
    );
  }

  async runProviderTests() {
    await this.startWireMock();
    await this.startProductApi();

    await this.runTask('WireMock downstream integration', runtimeImages.app, {
      entrypoint: ['node', '/repo/demo/app/tests/wiremock.integration.mjs'],
      command: [],
      user: 'node',
      environment: {
        APP_URL: 'http://app:8080',
        WIREMOCK_URL: 'http://wiremock:8080',
      },
      mounts: [readOnlyMount('demo/app')],
    });
    await this.runTask('Specmatic downstream provider', `specmatic/specmatic:${versions.SPECMATIC_VERSION}`, {
      workingDir: '/tmp',
      command: ['test', '/repo/demo/downstream/openapi.yaml', '--testBaseURL=http://wiremock:8080'],
      mounts: [readOnlyMount('demo/downstream')],
    });
    await this.runTask('Specmatic Product provider', `specmatic/specmatic:${versions.SPECMATIC_VERSION}`, {
      workingDir: '/tmp',
      command: ['test', '/repo/demo/openapi.yaml', '--testBaseURL=http://app:8080'],
      mounts: [readOnlyMount('demo')],
    });
    await this.runTask('Specmatic examples validation', `specmatic/specmatic:${versions.SPECMATIC_VERSION}`, {
      workingDir: '/tmp',
      command: ['examples', 'validate', '--spec-file', '/repo/demo/openapi.yaml'],
      mounts: [readOnlyMount('demo')],
    });
  }

  async runStatelessFuzzing() {
    await this.runTask('Schemathesis stateless Product fuzzing', `schemathesis/schemathesis:v${versions.SCHEMATHESIS_VERSION}`, {
      command: ['--config-file', '/repo/demo/schemathesis.toml', 'run', '/repo/demo/openapi.yaml', '--url=http://app:8080'],
      mounts: [readOnlyMount('demo')],
    });
  }

  async runStatefulTests() {
    await this.startStatefulApi();
    await this.runTask('Schemathesis stateful Order flow', `schemathesis/schemathesis:v${versions.SCHEMATHESIS_VERSION}`, {
      command: [
        'run',
        '/repo/demo/stateful/openapi.yaml',
        '--url=http://stateful-app:8082',
        '--phases',
        'stateful',
      ],
      mounts: [readOnlyMount('demo/stateful')],
    });
  }

  async startApiIntegrationServices() {
    await this.startWireMock();
    await this.startProductApi();
    await this.startStatefulApi();
  }

  async runNativeSuites() {
    const commonEnvironment = {
      API_BASE_URL: 'http://app:8080',
      OPENAPI_SPEC: '/repo/demo/openapi.yaml',
      STATEFUL_API_BASE_URL: 'http://stateful-app:8082',
      STATEFUL_OPENAPI_SPEC: '/repo/demo/stateful/openapi.yaml',
      FEATURE_CASES_PATH: '/repo/clients/shared/acceptance-cases.json',
    };
    const suites = [
      ['rust', 'Rust'],
      ['go', 'Go'],
      ['python', 'Python'],
      ['js', 'JavaScript'],
      ['ts', 'TypeScript'],
      ['playwright', 'Playwright API'],
      ['java', 'Java'],
      ['csharp', 'C#'],
    ];

    for (const [key, name] of suites) {
      if (!selectedNativeClients.has(key)) continue;
      const environment = {
        ...commonEnvironment,
        CLIENT_SUITE: key,
        CLIENT_SOURCE: `/repo/clients/${key}`,
        NPM_VERSION: versions.NPM_VERSION,
      };
      await this.runTask(`${name} API integration suite`, runtimeImages[key], {
        entrypoint: ['/bin/sh', '/repo/pipeline/client-suite.sh'],
        command: [],
        user: '10001:10001',
        environment,
        mounts: [
          readOnlyMount(`clients/${key}`),
          readOnlyMount('clients/shared'),
          readOnlyMount('pipeline/client-suite.sh'),
          readOnlyMount('demo'),
        ],
      });
    }
  }

  async runBddFeatures() {
    await this.runTask('JavaScript BDD acceptance features', runtimeImages.js, {
      entrypoint: ['/bin/sh', '/repo/pipeline/client-suite.sh'],
      command: [],
      user: '10001:10001',
      environment: {
        CLIENT_SUITE: 'js-bdd',
        CLIENT_SOURCE: '/repo/clients/js',
        CLIENT_FEATURES_SOURCE: '/repo/clients/features',
        API_BASE_URL: 'http://app:8080',
        OPENAPI_SPEC: '/repo/demo/openapi.yaml',
        STATEFUL_API_BASE_URL: 'http://stateful-app:8082',
        STATEFUL_OPENAPI_SPEC: '/repo/demo/stateful/openapi.yaml',
        NPM_VERSION: versions.NPM_VERSION,
      },
      mounts: [
        readOnlyMount('clients/js'),
        readOnlyMount('clients/features'),
        readOnlyMount('pipeline/client-suite.sh'),
        readOnlyMount('demo'),
      ],
    });
  }

  async runConsumerTests() {
    const image = `specmatic/specmatic:${versions.SPECMATIC_VERSION}`;
    const mock = await this.startService(image, 'specmatic-mock', {
      workingDir: '/tmp',
      command: ['mock', '/repo/demo/openapi.yaml'],
      mounts: [readOnlyMount('demo')],
    });

    if (!mock) throw new Error('Specmatic Smart Mock failed to start');

    const mockEnvironment = {
      MOCK_URL: 'http://specmatic-mock:9000',
      MOCK_EVALS_PATH: '/repo/evals/mock-data-evals.json',
    };
    await this.runTask('Specmatic mock data evaluations', runtimeImages.app, {
      entrypoint: ['node', '/repo/demo/app/tests/specmatic-mock.integration.mjs'],
      command: [],
      user: 'node',
      environment: mockEnvironment,
      mounts: [readOnlyMount('demo/app'), readOnlyMount('evals/mock-data-evals.json')],
    });
    await this.runTask('JavaScript consumer mock checks', runtimeImages.js, {
      entrypoint: ['/bin/sh', '/repo/pipeline/client-suite.sh'],
      command: [],
      user: '10001:10001',
      environment: {
        CLIENT_SUITE: 'js-consumer',
        CLIENT_SOURCE: '/repo/clients/js',
        API_BASE_URL: 'http://specmatic-mock:9000',
        OPENAPI_SPEC: '/repo/demo/openapi.yaml',
        NPM_VERSION: versions.NPM_VERSION,
      },
      mounts: [readOnlyMount('clients/js'), readOnlyMount('pipeline/client-suite.sh'), readOnlyMount('demo')],
    });
    await this.runTask('Playwright consumer mock checks', runtimeImages.playwright, {
      entrypoint: ['/bin/sh', '/repo/pipeline/client-suite.sh'],
      command: [],
      user: '10001:10001',
      environment: {
        CLIENT_SUITE: 'playwright-consumer',
        CLIENT_SOURCE: '/repo/clients/playwright',
        API_BASE_URL: 'http://specmatic-mock:9000',
        OPENAPI_SPEC: '/repo/demo/openapi.yaml',
        NPM_VERSION: versions.NPM_VERSION,
      },
      mounts: [readOnlyMount('clients/playwright'), readOnlyMount('pipeline/client-suite.sh'), readOnlyMount('demo')],
    });
  }

  async cleanup() {
    for (const service of this.services.reverse()) {
      await service.stop().catch((error) => console.warn(`Service cleanup failed: ${error.message}`));
    }
    if (this.network) {
      await this.network.stop().catch((error) => console.warn(`Network cleanup failed: ${error.message}`));
    }
  }

  writeTimingReport(status) {
    const totalSeconds = Math.round((Date.now() - this.startedAt) / 1000);
    const stages = completeStageReport(this.plannedStages, this.stages);

    const csv = [
      'stage,seconds,result',
      ...stages.map((stage) => `"${stage.name}",${stage.seconds},${stage.result}`),
      `total,${totalSeconds},${status}`,
      '',
    ].join('\n');
    const timingPath = resolve(repositoryRoot, process.env.PIPELINE_TIMINGS_FILE ?? '.artifacts/pipeline-timings.csv');
    mkdirSync(dirname(timingPath), { recursive: true });
    writeFileSync(timingPath, csv);

    const table = [
      '### Pipeline timings',
      '',
      '| Stage | Seconds | Result |',
      '|---|---:|---|',
      ...stages.map((stage) => `| ${stage.name} | ${stage.seconds} | ${stage.result} |`),
      `| **Total** | **${totalSeconds}** | **${status}** |`,
      '',
    ].join('\n');
    console.log(table);
    if (process.env.GITHUB_STEP_SUMMARY) {
      writeFileSync(process.env.GITHUB_STEP_SUMMARY, table, { flag: 'a' });
    }
  }
}

const pipeline = new ContractPipeline();
try {
  await pipeline.run();
} catch {
  process.exitCode = 1;
}
