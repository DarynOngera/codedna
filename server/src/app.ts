import express, { type NextFunction, type Request, type Response } from 'express';
import type { Config } from './config.ts';
import type { EmailProvider } from './email/provider.ts';
import { logger } from './logger.ts';
import { respond } from './respond.ts';
import { contactRouter } from './routes/contact.ts';

function corsMiddleware(allowedOrigins: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Access-Control-Max-Age', '86400');
    }
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  };
}

function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const e = err as { type?: string; message?: string; status?: number };

  if (e?.type === 'entity.too.large') {
    respond(
      res,
      413,
      { error: { code: 'payload_too_large', message: 'Message too large.' } },
      '/contact?status=error',
    );
    return;
  }

  if (e?.type === 'entity.parse.failed') {
    respond(
      res,
      400,
      { error: { code: 'invalid_body', message: 'Request body could not be read.' } },
      '/contact?status=error',
    );
    return;
  }

  logger.error('unhandled_error', {
    method: req.method,
    path: req.path,
    detail: e?.message ?? 'unknown',
  });
  respond(
    res,
    500,
    {
      error: {
        code: 'contact_unavailable',
        message: 'Something went wrong. Please email us directly.',
      },
    },
    '/contact?status=error',
  );
}

export function createApp(config: Config, provider: EmailProvider): express.Express {
  const app = express();

  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', 1);

  app.use(corsMiddleware(config.allowedOrigins));

  app.use(express.json({ limit: config.bodyLimitBytes, type: ['application/json'] }));
  app.use(
    express.urlencoded({
      extended: false,
      limit: config.bodyLimitBytes,
      type: 'application/x-www-form-urlencoded',
    }),
  );

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/contact', contactRouter({ config, provider }));

  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'not_found', message: 'Not found.' } });
  });

  app.use(errorHandler);

  return app;
}