import process from 'node:process';

export type NodeEnv = 'development' | 'production' | 'test';

export interface Config {
  nodeEnv: NodeEnv;
  port: number;
  host: string;
  allowedOrigins: string[];
  rateLimitWindowMs: number;
  rateLimitMax: number;
  bodyLimitBytes: number;
  resendApiKey: string;
  toEmail: string;
  fromEmail: string;
  trustProxy: boolean;
}

const REQUIRED_IN_PRODUCTION = ['RESEND_API_KEY', 'CONTACT_TO_EMAIL', 'CONTACT_FROM_EMAIL'] as const;

function int(value: string | undefined, fallback: number): number {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const nodeEnv: NodeEnv =
    env.NODE_ENV === 'production' || env.NODE_ENV === 'test' ? env.NODE_ENV : 'development';

  if (nodeEnv === 'production') {
    for (const key of REQUIRED_IN_PRODUCTION) {
      if (!env[key]) throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  const allowedOrigins = (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return {
    nodeEnv,
    port: int(env.PORT, 3000),
    host: env.HOST ?? '127.0.0.1',
    allowedOrigins:
      allowedOrigins.length > 0
        ? allowedOrigins
        : ['https://c0dedna.com', 'https://www.c0dedna.com', 'http://localhost:4321'],
    rateLimitWindowMs: int(env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    rateLimitMax: int(env.RATE_LIMIT_MAX, 5),
    bodyLimitBytes: 16 * 1024,
    resendApiKey: env.RESEND_API_KEY ?? '',
    toEmail: env.CONTACT_TO_EMAIL ?? '',
    fromEmail: env.CONTACT_FROM_EMAIL ?? '',
    trustProxy: env.TRUST_PROXY === '1' || env.TRUST_PROXY === 'true',
  };
}