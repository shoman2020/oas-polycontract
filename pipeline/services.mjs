/**
 * Service provisioning, lifecycle management, container factory, and readiness probing
 * for the Testcontainers pipeline runner.
 */

import { createHash } from 'node:crypto';
import { closeSync, fstatSync, mkdtempSync, openSync, readSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { runChildProcess } from './commands.mjs';

/**
 * Downloads the pinned WireMock standalone JAR with retry and SHA-256 verification.
 */
export async function downloadWireMockArtifact(wiremockVersion, wiremockSha256) {
  const artifactName = `wiremock-standalone-${wiremockVersion}.jar`;
  const cacheDirectory = mkdtempSync(join(tmpdir(), 'oas-polycontract-'));
  let artifactPath;
  const digest = (content) => createHash('sha256').update(content).digest('hex');
  const artifactUrls = [
    `https://repo.maven.apache.org/maven2/org/wiremock/wiremock-standalone/${wiremockVersion}/${artifactName}`,
    `https://repo1.maven.org/maven2/org/wiremock/wiremock-standalone/${wiremockVersion}/${artifactName}`,
  ];
  let descriptor;
  let retainArtifact = false;
  try {
    let download;
    for (const [index, artifactUrl] of artifactUrls.entries()) {
      artifactPath = join(cacheDirectory, `wiremock-${index}.jar`);
      descriptor = openSync(artifactPath, 'wx+', 0o600);
      download = await runChildProcess('curl', [
        '--fail', '--silent', '--show-error', '--location', '--retry', '3', '--retry-all-errors',
        '--proto', '=https', '--proto-redir', '=https', '--connect-timeout', '15', '--max-time', '60', '--retry-max-time', '90', '--max-filesize', '33554432', artifactUrl,
      ], { stdio: ['ignore', descriptor, 'pipe'] });
      if (download.exitCode === 0) break;
      closeSync(descriptor);
      descriptor = undefined;
    }
    if (!download || download.exitCode !== 0) {
      const detail = download?.stderr.trim();
      const result = download?.signal ? `signal ${download.signal}` : `exit code ${download?.exitCode ?? 'unknown'}`;
      throw new Error(`WireMock download failed from Maven Central mirrors${detail ? `: ${detail}` : ` with ${result}`}`);
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
    if (digest(content) !== wiremockSha256) {
      throw new Error(`WireMock ${wiremockVersion} SHA-256 did not match the pinned value`);
    }
    retainArtifact = true;
    return artifactPath;
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
    if (!retainArtifact) rmSync(cacheDirectory, { recursive: true, force: true });
  }
}

/**
 * Standard healthcheck definition for HTTP service containers.
 */
export const serviceHealthCheck = (port) => ({
  test: ['CMD', 'node', '-e', `fetch('http://127.0.0.1:${port}/healthz').then(response => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))`],
  interval: 5000,
  timeout: 3000,
  retries: 10,
  startPeriod: 2000,
});

/**
 * OOP Container Factory for instantiating and configuring Testcontainers instances.
 * Encapsulates container lifecycle defaults, network binding, wait strategies, and streams.
 */
export class ContainerFactory {
  constructor(GenericContainerClass, WaitHelper, network) {
    this.GenericContainer = GenericContainerClass;
    this.Wait = WaitHelper;
    this.network = network;
  }

  setNetwork(network) {
    this.network = network;
  }

  /**
   * Factory method to create a fully configured container.
   */
  create(image, options = {}) {
    const { alias } = options;
    const isService = Boolean(alias);
    let container = new this.GenericContainer(image)
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
        .withWaitStrategy(this.Wait.forHealthCheck());
    } else if (isService) {
      container = container.withWaitStrategy(this.Wait.forSuccessfulCommand('true'));
    } else {
      container = container.withWaitStrategy(this.Wait.forOneShotStartup());
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
}
