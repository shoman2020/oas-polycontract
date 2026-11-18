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

export function parseNativeClientSelection(value, supportedClients) {
  if (typeof value !== 'string' || value.trim() === '') return [...supportedClients];

  const selected = value.split(',').map((client) => client.trim().toLowerCase());
  if (selected.some((client) => client === '')) {
    throw new Error('POLYCONTRACT_NATIVE_CLIENTS must be a comma-separated list of client keys');
  }

  const duplicates = selected.filter((client, index) => selected.indexOf(client) !== index);
  if (duplicates.length > 0) {
    throw new Error(`POLYCONTRACT_NATIVE_CLIENTS contains duplicate client: ${duplicates[0]}`);
  }

  const unsupported = selected.filter((client) => !supportedClients.includes(client));
  if (unsupported.length > 0) {
    throw new Error(`Unsupported native client '${unsupported[0]}'; choose from ${supportedClients.join(', ')}`);
  }

  return selected;
}
