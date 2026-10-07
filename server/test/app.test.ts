import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, test } from 'node:test';
import { createApp } from '../src/app.ts';
import type { Config } from '../src/config.ts';
import type { EmailProvider, SendContactEmailInput } from '../src/email/provider.ts';

function testConfig(overrides: Partial<Config> = {}): Config {
  return {
    nodeEnv: 'test',
    port: 0,
    host: '127.0.0.1',
    allowedOrigins: ['https://c0dedna.com'],
    rateLimitWindowMs: 60_000,
    rateLimitMax: 5,
    bodyLimitBytes: 16_384,
    resendApiKey: 'test-key',
    toEmail: 'to@example.com',
    fromEmail: 'from@example.com',
    trustProxy: false,
    ...overrides,
  };
}

class FakeProvider implements EmailProvider {
  sent: SendContactEmailInput[] = [];
  fail = false;

  async send(input: SendContactEmailInput): Promise<void> {
    if (this.fail) throw new Error('provider down');
    this.sent.push(input);
  }
}

async function listen(app: ReturnType<typeof createApp>): Promise<{ server: Server; base: string }> {
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address() as AddressInfo;
  return { server, base: `http://127.0.0.1:${address.port}` };
}

let provider: FakeProvider;
let server: Server;
let base: string;

const validBody = {
  name: 'Ada Lovelace',
  email: 'ada@example.org',
  subject: 'A working question',
  message: 'This is a perfectly reasonable message body.',
};

before(async () => {
  provider = new FakeProvider();
  const app = createApp(testConfig(), provider);
  ({ server, base } = await listen(app));
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

test('GET /api/health returns ok', async () => {
  const res = await fetch(`${base}/api/health`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: 'ok' });
});

test('POST /api/contact accepts a valid JSON payload and delivers email', async () => {
  const res = await fetch(`${base}/api/contact`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(validBody),
  });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  assert.equal(provider.sent.length, 1);
  const mail = provider.sent[0]!;
  assert.equal(mail.to, 'to@example.com');
  assert.equal(mail.from, 'from@example.com');
  assert.equal(mail.replyTo, validBody.email);
  assert.match(mail.subject, /^\[CODEDNA contact\]/);
  assert.match(mail.text, /Ada Lovelace/);
});

test('POST /api/contact rejects an invalid payload with per-field errors', async () => {
  const res = await fetch(`${base}/api/contact`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ name: '', email: 'nope', subject: '', message: 'short' }),
  });
  assert.equal(res.status, 400);
  const payload = (await res.json()) as {
    error: { code: string; fields: Record<string, string> };
  };
  assert.equal(payload.error.code, 'validation');
  assert.ok(payload.error.fields.name);
  assert.ok(payload.error.fields.email);
  assert.ok(payload.error.fields.subject);
  assert.ok(payload.error.fields.message);
});

test('ignores the honeypot field and sends nothing', async () => {
  const sentBefore = provider.sent.length;
  const res = await fetch(`${base}/api/contact`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ ...validBody, website: 'I am a robot' }),
  });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  assert.equal(provider.sent.length, sentBefore);
});

test('redirects a plain HTML form post to the success page', async () => {
  const form = new URLSearchParams({
    name: validBody.name,
    email: validBody.email,
    subject: validBody.subject,
    message: validBody.message,
  });
  const res = await fetch(`${base}/api/contact`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      accept: 'text/html,application/xhtml+xml',
    },
    body: form.toString(),
    redirect: 'manual',
  });
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('location'), '/contact?status=sent');
});

test('rejects an oversized body with 413', async () => {
  const res = await fetch(`${base}/api/contact`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ ...validBody, message: 'x'.repeat(20_000) }),
  });
  assert.equal(res.status, 413);
  const payload = (await res.json()) as { error: { code: string } };
  assert.equal(payload.error.code, 'payload_too_large');
});

test('rejects an unsupported content type cleanly', async () => {
  const res = await fetch(`${base}/api/contact`, {
    method: 'POST',
    headers: { 'content-type': 'text/plain', accept: 'application/json' },
    body: 'plain text body',
  });
  assert.equal(res.status, 400);
});

test('calls the provider failure path with a generic 502', async () => {
  const flaky = new FakeProvider();
  flaky.fail = true;
  const app = createApp(testConfig(), flaky);
  const { server: s2, base: b2 } = await listen(app);
  try {
    const res = await fetch(`${b2}/api/contact`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(validBody),
    });
    assert.equal(res.status, 502);
    const payload = (await res.json()) as { error: { code: string; message: string } };
    assert.equal(payload.error.code, 'contact_unavailable');
    assert.doesNotMatch(payload.error.message, /resend|provider/i);
  } finally {
    await new Promise<void>((resolve) => s2.close(() => resolve()));
  }
});

test('sets CORS headers only for allowlisted origins', async () => {
  const allowRes = await fetch(`${base}/api/health`, {
    headers: { origin: 'https://c0dedna.com' },
  });
  assert.equal(allowRes.headers.get('access-control-allow-origin'), 'https://c0dedna.com');

  const denyRes = await fetch(`${base}/api/health`, {
    headers: { origin: 'https://evil.example' },
  });
  assert.equal(denyRes.headers.get('access-control-allow-origin'), null);
});

test('answers preflight only for allowed origins', async () => {
  const res = await fetch(`${base}/api/contact`, {
    method: 'OPTIONS',
    headers: {
      origin: 'https://c0dedna.com',
      'access-control-request-method': 'POST',
      'access-control-request-headers': 'content-type',
    },
  });
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('access-control-allow-origin'), 'https://c0dedna.com');
  assert.equal(res.headers.get('access-control-allow-methods'), 'GET,POST,OPTIONS');
});

test('rate limits POST /api/contact per IP', async () => {
  const app = createApp(
    testConfig({ rateLimitMax: 2, rateLimitWindowMs: 60_000 }),
    new FakeProvider(),
  );
  const { server: s3, base: b3 } = await listen(app);
  try {
    const options = {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(validBody),
    };
    const first = await fetch(`${b3}/api/contact`, options);
    const second = await fetch(`${b3}/api/contact`, options);
    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    const third = await fetch(`${b3}/api/contact`, options);
    assert.equal(third.status, 429);
    const payload = (await third.json()) as { error: { code: string } };
    assert.equal(payload.error.code, 'rate_limit');
  } finally {
    await new Promise<void>((resolve) => s3.close(() => resolve()));
  }
});