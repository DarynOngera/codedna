import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import type { Config } from '../config.ts';
import type { EmailProvider } from '../email/provider.ts';
import { logger } from '../logger.ts';
import { respond } from '../respond.ts';
import { validateContact } from '../validation.ts';

interface Deps {
  config: Config;
  provider: EmailProvider;
}

function composeText(name: string, email: string, message: string): string {
  return `From: ${name}\nEmail: ${email}\n\n${message}`;
}

export function contactRouter({ config, provider }: Deps): Router {
  const router = Router();

  router.post(
    '/',
    rateLimit({
      windowMs: config.rateLimitWindowMs,
      limit: config.rateLimitMax,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      handler: (req, res) => {
        respond(
          res,
          429,
          {
            error: {
              code: 'rate_limit',
              message: 'Too many messages. Please wait a few minutes and try again.',
            },
          },
          '/contact?status=rate-limited',
        );
      },
    }),
    async (req, res) => {
      const body = req.body as Record<string, unknown> | undefined;

      const honeypot = body?.['website'];
      if (typeof honeypot === 'string' && honeypot.trim().length > 0) {
        // Bots fill the hidden field. Pretend success, send nothing.
        logger.info('contact_honeypot_triggered');
        respond(res, 200, { ok: true }, '/contact?status=sent');
        return;
      }

      const result = validateContact(body);
      if (!result.ok) {
        respond(
          res,
          400,
          {
            error: {
              code: 'validation',
              message: 'Please correct the highlighted fields.',
              fields: result.errors,
            },
          },
          '/contact?status=error',
        );
        return;
      }

      try {
        await provider.send({
          from: config.fromEmail,
          to: config.toEmail,
          replyTo: result.value.email,
          subject: `[CODEDNA contact] ${result.value.subject}`,
          text: composeText(result.value.name, result.value.email, result.value.message),
        });
      } catch (err) {
        logger.error('contact_send_failed', {
          detail: err instanceof Error ? err.message : 'unknown',
        });
        respond(
          res,
          502,
          {
            error: {
              code: 'contact_unavailable',
              message: 'We could not send your message right now. Please email us directly.',
            },
          },
          '/contact?status=error',
        );
        return;
      }

      logger.info('contact_sent', { to: config.toEmail });
      respond(res, 200, { ok: true }, '/contact?status=sent');
    },
  );

  return router;
}