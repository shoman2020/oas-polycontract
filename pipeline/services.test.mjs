import test from 'node:test';
import assert from 'node:assert/strict';
import { ContainerFactory, serviceHealthCheck } from './services.mjs';

class MockGenericContainer {
  constructor(image) {
    this.image = image;
    this.network = null;
    this.timeout = null;
    this.alias = null;
    this.waitStrategy = null;
    this.healthCheck = null;
    this.workingDir = null;
    this.entrypoint = null;
    this.environment = null;
    this.user = null;
    this.command = null;
    this.mounts = null;
    this.copyFiles = null;
    this.logConsumerConfigured = false;
  }

  withNetwork(network) {
    this.network = network;
    return this;
  }

  withStartupTimeout(timeout) {
    this.timeout = timeout;
    return this;
  }

  withLogConsumer() {
    this.logConsumerConfigured = true;
    return this;
  }

  withNetworkAliases(alias) {
    this.alias = alias;
    return this;
  }

  withWaitStrategy(strategy) {
    this.waitStrategy = strategy;
    return this;
  }

  withHealthCheck(healthCheck) {
    this.healthCheck = healthCheck;
    return this;
  }

  withWorkingDir(dir) {
    this.workingDir = dir;
    return this;
  }

  withEntrypoint(entrypoint) {
    this.entrypoint = entrypoint;
    return this;
  }

  withEnvironment(env) {
    this.environment = env;
    return this;
  }

  withUser(user) {
    this.user = user;
    return this;
  }

  withCommand(cmd) {
    this.command = cmd;
    return this;
  }

  withBindMounts(mounts) {
    this.mounts = mounts;
    return this;
  }

  withCopyFilesToContainer(files) {
    this.copyFiles = files;
    return this;
  }
}

const mockWait = {
  forHealthCheck: () => 'WAIT_HEALTH_CHECK',
  forSuccessfulCommand: (cmd) => `WAIT_CMD_${cmd}`,
  forOneShotStartup: () => 'WAIT_ONE_SHOT',
};

test('ContainerFactory creates a service container with default service wait strategy', () => {
  const factory = new ContainerFactory(MockGenericContainer, mockWait, 'mock-network');
  const container = factory.create('mock-image:1.0', { alias: 'mock-service' });

  assert.equal(container.image, 'mock-image:1.0');
  assert.equal(container.network, 'mock-network');
  assert.equal(container.alias, 'mock-service');
  assert.equal(container.timeout, 120_000);
  assert.equal(container.waitStrategy, 'WAIT_CMD_true');
  assert.equal(container.logConsumerConfigured, true);
});

test('ContainerFactory creates a one-shot task container with one-shot wait strategy', () => {
  const factory = new ContainerFactory(MockGenericContainer, mockWait, 'mock-network');
  const container = factory.create('node:test', {
    command: ['node', 'app.mjs'],
    user: '10001:10001',
  });

  assert.equal(container.image, 'node:test');
  assert.equal(container.network, 'mock-network');
  assert.equal(container.alias, null);
  assert.equal(container.timeout, 3_600_000);
  assert.equal(container.waitStrategy, 'WAIT_ONE_SHOT');
  assert.deepEqual(container.command, ['node', 'app.mjs']);
  assert.equal(container.user, '10001:10001');
});

test('ContainerFactory respects custom healthCheck and explicit waitStrategy', () => {
  const factory = new ContainerFactory(MockGenericContainer, mockWait, 'mock-network');
  const hc = serviceHealthCheck(8080);
  const container = factory.create('api:latest', {
    alias: 'api',
    healthCheck: hc,
  });

  assert.deepEqual(container.healthCheck, hc);
  assert.equal(container.waitStrategy, 'WAIT_HEALTH_CHECK');
});
