import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { parseFeatureSources, readFeatureCases } from './feature-cases.mjs';

const featureDirectory = fileURLToPath(new URL('../features/', import.meta.url));

test('each Product and Order Gherkin scenario has unique structured test data', () => {
  const cases = readFeatureCases(featureDirectory);
  const caseIds = cases.map(({ caseId }) => caseId);

  assert.equal(cases.length, 8);
  assert.equal(new Set(caseIds).size, cases.length);
  assert.ok(caseIds.includes('product.available'));
  assert.ok(caseIds.includes('order.unsupported-method'));
});

test('supports adding an API feature without changing the parser', () => {
  const cases = parseFeatureSources([{
    fileName: 'billing-api.feature',
    contents: [
      'Feature: Billing',
      '  Scenario: Create an invoice',
      '    """json',
      '    {"caseId":"billing.invoice-created","expectedStatus":201}',
      '    """',
    ].join('\n'),
  }]);

  assert.deepEqual(cases.map(({ api, caseId }) => ({ api, caseId })), [
    { api: 'billing', caseId: 'billing.invoice-created' },
  ]);
});

test('rejects a scenario without acceptance data', () => {
  assert.throws(
    () => parseFeatureSources([{
      fileName: 'product-api.feature',
      contents: 'Feature: Product\n  Scenario: missing data\n    When a client calls the API',
    }]),
    /exactly one JSON acceptance data block/,
  );
});

test('rejects duplicate case identifiers', () => {
  const contents = [
    'Feature: Product',
    '  Scenario: first',
    '    """json',
    '    {"caseId":"product.duplicate"}',
    '    """',
    '  Scenario: second',
    '    """json',
    '    {"caseId":"product.duplicate"}',
    '    """',
  ].join('\n');

  assert.throws(
    () => parseFeatureSources([{ fileName: 'product-api.feature', contents }]),
    /Duplicate acceptance case: product\.duplicate/,
  );
});

test('rejects scenarios with multiple acceptance data blocks', () => {
  const contents = [
    'Feature: Product',
    '  Scenario: ambiguous data',
    '    """json',
    '    {"caseId":"product.first"}',
    '    """',
    '    """json',
    '    {"caseId":"product.second"}',
    '    """',
  ].join('\n');

  assert.throws(
    () => parseFeatureSources([{ fileName: 'product-api.feature', contents }]),
    /multiple JSON acceptance data blocks/,
  );
});
