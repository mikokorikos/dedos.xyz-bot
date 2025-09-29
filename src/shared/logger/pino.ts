import pinoLogger, { type Bindings, type Logger } from 'pino';

import { env } from '@/shared/config/env';

const isDevelopment = env.NODE_ENV === 'development';

export const logger = pinoLogger({
  level: env.LOG_LEVEL,
  base: {
    env: env.NODE_ENV,
  },
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});

export const createChildLogger = (bindings: Bindings): Logger => logger.child(bindings);
