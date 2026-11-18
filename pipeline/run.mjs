import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readVersionPins } from './config.mjs';

const repositoryRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));

const readOnlyMount = (path, target = `/repo/${path}`) => ({
  source: join(repositoryRoot, path),
  target,
  mode: 'ro',
});

const contractMounts = [
  readOnlyMount('demo'),
  readOnlyMount('openapi'),
  readOnlyMount('contracts/events'),
  readOnlyMount('gates/lint'),
];

const localImages = {
  app: 'oas-polycontract-app:latest',
  wiremock: 'oas-polycontract-wiremock:latest',
  stateful: 'oas-polycontract-stateful:local',
  rust: 'oas-polycontract-rust:local',
  go: 'oas-polycontract-go:local',
  python: 'oas-polycontract-python:local',
  js: 'oas-polycontract-js:local',
  ts: 'oas-polycontract-ts:local',
  playwright: 'oas-polycontract-playwright:local',
  java: 'oas-polycontract-java:local',
  csharp: 'oas-polycontract-csharp:local',
};

const clientImages = [
  { key: 'rust', context: 'clients/rust', args: ['RUST_VERSION'] },
  { key: 'go', context: 'clients/go', args: ['GO_VERSION'] },
  { key: 'python', context: 'clients/python', args: ['PYTHON_VERSION'] },
  { key: 'js', context: 'clients/js', args: ['NODE_VERSION'] },
  { key: 'ts', context: 'clients/ts', args: ['NODE_VERSION', 'NPM_VERSION'] },
  { key: 'playwright', context: 'clients/playwright', args: ['NODE_VERSION'] },
  { key: 'java', context: 'clients/java', args: ['MAVEN_VERSION', 'JAVA_VERSION'] },
  { key: 'csharp', context: 'clients/csharp', args: ['DOTNET_VERSION'] },
];

const versions = readVersionPins(join(repositoryRoot, '.github/versions.env'), [
  'OASDIFF_VERSION',
  'SCHEMATHESIS_VERSION',
  'SPECMATIC_VERSION',
  'SPECTRAL_VERSION',
  'TESTCONTAINERS_RYUK_VERSION',
  'WIREMOCK_VERSION',
  ...new Set(clientImages.flatMap(({ args }) => args)),
]);

process.env.RYUK_CONTAINER_IMAGE = `testcontainers/ryuk:${versions.TESTCONTAINERS_RYUK_VERSION}`;
const { GenericContainer, Network, PullPolicy, Wait } = await import('testcontainers');

class ContractPipeline {
  constructor() {
    this.network = undefined;
    this.services = [];
    this.stages = [];
    this.stageName = undefined;
    this.stageStart = 0;
    this.startedAt = Date.now();
  }

  async run() {
    let failure;
    try {
      await this.stage('Testcontainers network', async () => {
        this.network = await new Network().start();
      });
      await this.stage('Repository evaluations', () => this.runEvaluations());
      await this.stage('Contract lint', () => this.runContractLint());
      await this.stage('Compatibility', () => this.runOasDiff());
      await this.stage('Build local images', () => this.buildImages());
      await this.stage('Provider and downstream contract tests', () => this.runProviderTests());
      await this.stage('Stateless fuzzing', () => this.runStatelessFuzzing());
      await this.stage('Stateful API tests', () => this.runStatefulTests());
      await this.stage('Native API integration suites', () => this.runNativeSuites());
      await this.stage('Consumer contract tests and mock evaluations', () => this.runConsumerTests());
      console.log('==> Contract pipeline passed');
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

  async buildImage(name, context, buildArgs = {}) {
    const image = await GenericContainer
      .fromDockerfile(join(repositoryRoot, context))
      .withBuildArgs(buildArgs)
      .build(name, { deleteOnExit: false });
    return image;
  }

  async buildImages() {
    await this.buildImage(localImages.wiremock, 'demo/wiremock', {
      WIREMOCK_VERSION: versions.WIREMOCK_VERSION,
    });
    await this.buildImage(localImages.app, 'demo/app', {
      NODE_VERSION: versions.NODE_VERSION,
    });
    await this.buildImage(localImages.stateful, 'demo/stateful', {
      NODE_VERSION: versions.NODE_VERSION,
    });

    for (const client of clientImages) {
      const buildArgs = Object.fromEntries(client.args.map((key) => [key, versions[key]]));
      await this.buildImage(localImages[client.key], client.context, buildArgs);
    }
  }

  runEvaluations() {
    const result = spawnSync(process.execPath, [join(repositoryRoot, 'evals/run.mjs')], {
      cwd: repositoryRoot,
      stdio: 'inherit',
    });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`Repository evaluations exited with ${result.status}`);
  }

  commandContainer(image, options = {}) {
    let container = new GenericContainer(image)
      .withNetwork(this.network)
      .withWaitStrategy(Wait.forOneShotStartup())
      .withStartupTimeout(options.timeout ?? 60 * 60 * 1000)
      .withLogConsumer((stream) => {
        stream.on('data', (line) => process.stdout.write(line));
        stream.on('err', (line) => process.stderr.write(line));
      });

    if (options.localImage) container = container.withPullPolicy(PullPolicy.neverPull());
    if (options.workingDir) container = container.withWorkingDir(options.workingDir);
    if (options.entrypoint) container = container.withEntrypoint(options.entrypoint);
    if (options.environment) container = container.withEnvironment(options.environment);
    if (options.command) container = container.withCommand(options.command);
    if (options.mounts) container = container.withBindMounts(options.mounts);
    return container;
  }

  async runTask(name, image, options = {}) {
    console.log(`  -> ${name}`);
    const container = this.commandContainer(image, options);
    const completed = await container.start();
    await completed.stop().catch((error) => console.warn(`Container cleanup for ${name}: ${error.message}`));
  }

  async startService(image, alias, options = {}) {
    let container = new GenericContainer(image)
      .withNetwork(this.network)
      .withNetworkAliases(alias)
      .withStartupTimeout(120_000)
      .withLogConsumer((stream) => {
        stream.on('data', (line) => process.stdout.write(line));
        stream.on('err', (line) => process.stderr.write(line));
      });

    if (options.healthCheck) {
      container = container
        .withHealthCheck(options.healthCheck)
        .withWaitStrategy(Wait.forHealthCheck());
    } else {
      container = container.withWaitStrategy(Wait.forSuccessfulCommand('true'));
    }

    if (options.localImage) container = container.withPullPolicy(PullPolicy.neverPull());
    if (options.command) container = container.withCommand(options.command);
    if (options.environment) container = container.withEnvironment(options.environment);
    if (options.workingDir) container = container.withWorkingDir(options.workingDir);
    if (options.mounts) container = container.withBindMounts(options.mounts);

    const started = await container.start();
    this.services.push(started);
    return started;
  }

  async startWireMock() {
    return this.startService(localImages.wiremock, 'wiremock', {
      localImage: true,
      command: ['--global-response-templating'],
      mounts: [{
        source: join(repositoryRoot, 'demo/downstream/wiremock'),
        target: '/home/wiremock',
        mode: 'ro',
      }],
      healthCheck: {
        test: ['CMD-SHELL', 'wget -qO- http://127.0.0.1:8080/__admin/mappings >/dev/null'],
        interval: 5000,
        timeout: 3000,
        retries: 10,
        startPeriod: 2000,
      },
    });
  }

  async startProductApi() {
    return this.startService(localImages.app, 'app', {
      localImage: true,
      environment: {
        INVENTORY_URL: 'http://wiremock:8080',
        PORT: '8080',
      },
      healthCheck: {
        test: ['CMD', 'node', '-e', "fetch('http://127.0.0.1:8080/healthz').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"],
        interval: 5000,
        timeout: 3000,
        retries: 10,
        startPeriod: 2000,
      },
    });
  }

  async startStatefulApi() {
    return this.startService(localImages.stateful, 'stateful-app', {
      localImage: true,
      environment: { PORT: '8082' },
      healthCheck: {
        test: ['CMD', 'node', '-e', "fetch('http://127.0.0.1:8082/healthz').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"],
        interval: 5000,
        timeout: 3000,
        retries: 10,
        startPeriod: 2000,
      },
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

  async runOasDiff() {
    await this.runTask('OpenAPI compatibility', `tufin/oasdiff:v${versions.OASDIFF_VERSION}`, {
      command: ['breaking', '/repo/openapi/openapi.base.yaml', '/repo/openapi/openapi.yaml'],
      mounts: [readOnlyMount('openapi')],
    });
  }

  async runProviderTests() {
    await this.startWireMock();
    await this.startProductApi();

    await this.runTask('WireMock downstream integration', localImages.app, {
      localImage: true,
      command: ['node', 'tests/wiremock.integration.mjs'],
      environment: {
        APP_URL: 'http://app:8080',
        WIREMOCK_URL: 'http://wiremock:8080',
      },
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

  async runNativeSuites() {
    const commonEnvironment = {
      API_BASE_URL: 'http://app:8080',
      OPENAPI_SPEC: '/repo/demo/openapi.yaml',
      STATEFUL_API_BASE_URL: 'http://stateful-app:8082',
      STATEFUL_OPENAPI_SPEC: '/repo/demo/stateful/openapi.yaml',
    };
    const suites = [
      ['Rust', localImages.rust, commonEnvironment],
      ['Go', localImages.go, commonEnvironment],
      ['Python', localImages.python, commonEnvironment],
      ['JavaScript', localImages.js, commonEnvironment],
      ['TypeScript', localImages.ts, commonEnvironment],
      ['Playwright API', localImages.playwright, {
        API_BASE_URL: commonEnvironment.API_BASE_URL,
        OPENAPI_SPEC: commonEnvironment.OPENAPI_SPEC,
      }, ['npm', 'run', 'test:provider']],
      ['Java', localImages.java, commonEnvironment],
      ['C#', localImages.csharp, commonEnvironment],
    ];

    for (const [name, image, environment, command] of suites) {
      await this.runTask(`${name} API integration suite`, image, {
        localImage: true,
        environment,
        command,
        mounts: [readOnlyMount('demo')],
      });
    }
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
    await this.runTask('Specmatic mock data evaluations', localImages.app, {
      localImage: true,
      command: ['node', 'tests/specmatic-mock.integration.mjs'],
      environment: mockEnvironment,
      mounts: [readOnlyMount('evals/mock-data-evals.json')],
    });
    await this.runTask('JavaScript consumer contract tests', localImages.js, {
      localImage: true,
      command: ['npm', 'run', 'test:consumer'],
      environment: {
        API_BASE_URL: 'http://specmatic-mock:9000',
        OPENAPI_SPEC: '/repo/demo/openapi.yaml',
      },
      mounts: [readOnlyMount('demo')],
    });
    await this.runTask('Playwright consumer contract tests', localImages.playwright, {
      localImage: true,
      command: ['npm', 'run', 'test:consumer'],
      environment: {
        API_BASE_URL: 'http://specmatic-mock:9000',
        OPENAPI_SPEC: '/repo/demo/openapi.yaml',
      },
      mounts: [readOnlyMount('demo')],
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
    const stages = [...this.stages];

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
