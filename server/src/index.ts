import { createApp } from './app.ts';
import { loadConfig } from './config.ts';
import { ResendProvider } from './email/resend.ts';
import { logger } from './logger.ts';

const config = loadConfig();
const app = createApp(config, new ResendProvider(config.resendApiKey));

const server = app.listen(config.port, config.host, () => {
  logger.info('codedna-api listening', {
    host: config.host,
    port: config.port,
    env: config.nodeEnv,
  });
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    logger.info('shutting_down', { signal });
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000).unref();
  });
}