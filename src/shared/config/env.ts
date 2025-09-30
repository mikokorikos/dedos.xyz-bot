// ============================================================================
// RUTA: src/shared/config/env.ts
// ============================================================================

import { z } from 'zod';

const booleanLike = z
  .union([z.boolean(), z.string()])
  .transform((value) => {
    if (typeof value === 'boolean') {
      return value;
    }

    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'y'].includes(normalized)) {
      return true;
    }
    if (['0', 'false', 'no', 'n', ''].includes(normalized)) {
      return false;
    }

    throw new Error(`Valor booleano inválido: ${value}`);
  });

const optionalUrl = z
  .string()
  .url()
  .or(z.literal(''))
  .transform((value) => (value === '' ? undefined : value));

const RawEnvSchema = z
  .object({
    DISCORD_TOKEN: z.string().min(1, 'DISCORD_TOKEN es obligatorio'),
    DISCORD_CLIENT_ID: z
      .string()
      .regex(/^\d{17,20}$/u, 'DISCORD_CLIENT_ID debe ser un snowflake de Discord'),
    DISCORD_GUILD_ID: z
      .string()
      .regex(/^\d{17,20}$/u, 'DISCORD_GUILD_ID debe ser un snowflake de Discord')
      .optional(),
    DATABASE_URL: z.string().url('DATABASE_URL debe ser una URL válida').optional(),
    MYSQL_HOST: z.string().min(1, 'MYSQL_HOST es obligatorio cuando no hay DATABASE_URL').optional(),
    MYSQL_PORT: z.coerce.number().int().positive().max(65535).default(3306),
    MYSQL_USER: z.string().min(1, 'MYSQL_USER es obligatorio cuando no hay DATABASE_URL').optional(),
    MYSQL_PASSWORD: z.string().min(1, 'MYSQL_PASSWORD es obligatorio cuando no hay DATABASE_URL').optional(),
    MYSQL_DATABASE: z.string().min(1, 'MYSQL_DATABASE es obligatorio cuando no hay DATABASE_URL').optional(),
    REDIS_URL: optionalUrl.optional(),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    ENABLE_CACHE: booleanLike.default(false),
    ENABLE_SHARDING: booleanLike.default(false),
    SENTRY_DSN: optionalUrl.optional(),
    OTEL_EXPORTER_OTLP_ENDPOINT: optionalUrl.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.DATABASE_URL) {
      return;
    }

    const requiredVars = ['MYSQL_HOST', 'MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_DATABASE'] as const;

    const missingVars = requiredVars.filter((variable) => !value[variable]);
    if (missingVars.length > 0) {
      for (const variable of missingVars) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [variable],
          message: `${variable} es obligatorio cuando no hay DATABASE_URL`,
        });
      }
      return;
    }

  });

type RawEnv = z.infer<typeof RawEnvSchema>;

const buildDatabaseUrl = (config: RawEnv): string => {
  const user = encodeURIComponent(config.MYSQL_USER!);
  const password = encodeURIComponent(config.MYSQL_PASSWORD!);
  const host = config.MYSQL_HOST!;
  const port = config.MYSQL_PORT ?? 3306;
  const database = config.MYSQL_DATABASE!;
  return `mysql://${user}:${password}@${host}:${port}/${database}`;
};

const rawEnv = RawEnvSchema.parse(process.env);

export type Env = RawEnv & { DATABASE_URL: string };

export const env: Env = {
  ...rawEnv,
  DATABASE_URL: rawEnv.DATABASE_URL ?? buildDatabaseUrl(rawEnv),
};
