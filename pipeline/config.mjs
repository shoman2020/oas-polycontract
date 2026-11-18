import { readFileSync } from 'node:fs';

const VERSION_KEY = /^[A-Z][A-Z0-9_]*$/;

export function parseVersionPins(contents, requiredKeys = []) {
  const versions = Object.create(null);

  for (const [index, originalLine] of contents.split(/\r?\n/).entries()) {
    const line = originalLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separator = line.indexOf('=');
    if (separator < 1) {
      throw new Error(`Invalid version pin on line ${index + 1}: expected KEY=value`);
    }

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (!VERSION_KEY.test(key) || !value) {
      throw new Error(`Invalid version pin on line ${index + 1}: expected a key and value`);
    }
    if (Object.hasOwn(versions, key)) {
      throw new Error(`Duplicate version pin on line ${index + 1}: ${key}`);
    }
    versions[key] = value;
  }

  for (const key of requiredKeys) {
    if (!Object.hasOwn(versions, key)) {
      throw new Error(`Missing required version pin: ${key}`);
    }
  }

  return Object.freeze(versions);
}

export function readVersionPins(path, requiredKeys = []) {
  return parseVersionPins(readFileSync(path, 'utf8'), requiredKeys);
}
