import assert from 'node:assert/strict';
import test from 'node:test';
import { parseVersionPins } from './config.mjs';

test('parses comments, blank lines, and values containing equals signs', () => {
  const versions = parseVersionPins('# pinned tools\n\nNODE_VERSION = 26\nTOKEN=a=b\n', ['NODE_VERSION']);

  assert.equal(versions.NODE_VERSION, '26');
  assert.equal(versions.TOKEN, 'a=b');
  assert.equal(Object.isFrozen(versions), true);
});

test('rejects malformed and empty pins with line numbers', () => {
  assert.throws(() => parseVersionPins('NODE_VERSION=26\ninvalid'), /line 2/);
  assert.throws(() => parseVersionPins('NODE_VERSION='), /line 1/);
});

test('rejects duplicate keys instead of silently replacing a pin', () => {
  assert.throws(() => parseVersionPins('NODE_VERSION=26\nNODE_VERSION=27'), /Duplicate version pin.*NODE_VERSION/);
});

test('checks all caller-required pins exist', () => {
  assert.throws(() => parseVersionPins('NODE_VERSION=26', ['NODE_VERSION', 'NPM_VERSION']), /NPM_VERSION/);
});
