import process from 'node:process';

type Level = 'debug' | 'info' | 'warn' | 'error';

/**
 * Tiny structured logger. Emits one JSON object per line to stdout/stderr.
 * Deliberately does not log request bodies or anything with PII.
 */
function emit(level: Level, message: string, extra?: Record<string, unknown>): void {
  if (level === 'debug' && process.env.NODE_ENV === 'production') return;
  const line = JSON.stringify({ ts: new Date().toISOString(), level, message, ...extra });
  const stream = level === 'error' ? process.stderr : process.stdout;
  stream.write(`${line}\n`);
}

export const logger = {
  debug: (message: string, extra?: Record<string, unknown>) => emit('debug', message, extra),
  info: (message: string, extra?: Record<string, unknown>) => emit('info', message, extra),
  warn: (message: string, extra?: Record<string, unknown>) => emit('warn', message, extra),
  error: (message: string, extra?: Record<string, unknown>) => emit('error', message, extra),
};