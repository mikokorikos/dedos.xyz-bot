import { z } from 'zod';

export const EnvSchema = z.object({
  DISCORD_TOKEN: z.string().min(1, 'DISCORD_TOKEN es obligatorio'),
  DISCORD_CLIENT_ID: z.string().min(1, 'DISCORD_CLIENT_ID es obligatorio'),
  DISCORD_GUILD_ID: z.string().min(1).optional(),
  DATABASE_URL: z.string().url('DATABASE_URL debe ser una URL válida'),
  REDIS_URL: z.string().url().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  ENABLE_CACHE: z.coerce.boolean().optional().default(false),
  ENABLE_SHARDING: z.coerce.boolean().optional().default(false),
  SENTRY_DSN: z.string().url().optional(),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

export const env: Env = EnvSchema.parse(process.env);
