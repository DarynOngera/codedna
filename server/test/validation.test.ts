import assert from 'node:assert/strict';
import { test } from 'node:test';
import { stripControl, validateContact } from '../src/validation.ts';

const validPayload = () => ({
  name: 'Ada Lovelace',
  email: 'ada@example.org',
  subject: 'A working question',
  message: 'This is a perfectly reasonable message body.',
});

test('accepts a valid contact payload', () => {
  const result = validateContact(validPayload());
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.value, validPayload());
  }
});

test('rejects non-object payloads', () => {
  for (const input of [null, undefined, 'string', 42, [], ['name']]) {
    const result = validateContact(input);
    assert.equal(result.ok, false, `expected failure for ${JSON.stringify(input)}`);
    if (!result.ok) assert.ok(result.errors.name);
  }
});

test('rejects when every field is missing', () => {
  const result = validateContact({});
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.name);
    assert.ok(result.errors.email);
    assert.ok(result.errors.subject);
    assert.ok(result.errors.message);
  }
});

test('rejects a malformed email', () => {
  const result = validateContact({ ...validPayload(), email: 'not-an-email' });
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.errors.email);
});

test('rejects non-string field values', () => {
  const result = validateContact({ ...validPayload(), name: 123 });
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.errors.name);
});

test('rejects an over-long name and subject', () => {
  const result = validateContact({
    ...validPayload(),
    name: 'x'.repeat(130),
    subject: 'x'.repeat(210),
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.name);
    assert.ok(result.errors.subject);
  }
});

test('rejects an over-long email by raw length', () => {
  const result = validateContact({ ...validPayload(), email: `${'a'.repeat(260)}@example.org` });
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.errors.email);
});

test('rejects a message that is too short', () => {
  const result = validateContact({ ...validPayload(), message: 'short' });
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.errors.message);
});

test('rejects a message that is too long', () => {
  const result = validateContact({ ...validPayload(), message: 'x'.repeat(6000) });
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.errors.message);
});

test('trims surrounding whitespace', () => {
  const result = validateContact({
    ...validPayload(),
    name: '  Ada  ',
    message: '  A valid message with padding.  ',
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.name, 'Ada');
    assert.equal(result.value.message, 'A valid message with padding.');
  }
});

test('strips control characters but keeps line breaks', () => {
  assert.equal(stripControl('a\u0000b\u0007c'), 'abc');
  assert.equal(stripControl('line1\r\nline2\rline3'), 'line1\nline2\nline3');
  const result = validateContact({ ...validPayload(), message: 'line1\u0000\nline2' });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.value.message, 'line1\nline2');
});

test('ignores non-string email values as invalid', () => {
  const result = validateContact({ ...validPayload(), email: { domain: 'example.org' } });
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.errors.email);
});