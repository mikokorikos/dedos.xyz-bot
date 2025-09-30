// ============================================================================
// RUTA: src/index.ts
// ============================================================================

import 'dotenv/config';

import { randomUUID } from 'node:crypto';

import type { ClientEvents } from 'discord.js';
import { Client, GatewayIntentBits } from 'discord.js';

import { disconnectDatabase, ensureDatabaseConnection, prisma } from '@/infrastructure/db/prisma';
import { commandRegistry } from '@/presentation/commands';
import { interactionCreateEvent } from '@/presentation/events/interactionCreate';
import { readyEvent } from '@/presentation/events/ready';
import type { EventDescriptor } from '@/presentation/events/types';
import { env } from '@/shared/config/env';
import { logger } from '@/shared/logger/pino';

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const registerEvent = <K extends keyof ClientEvents>(descriptor: EventDescriptor<K>): void => {
  const handler = (...args: ClientEvents[K]): void => {
    void (async () => {
      try {
        await descriptor.execute(...args);
      } catch (error) {
        const referenceId = randomUUID();
        logger.error({ event: descriptor.name, referenceId, err: error }, 'Error ejecutando evento.');
      }
    })();
  };

  if (descriptor.once) {
    client.once(descriptor.name, handler);
    return;
  }

  client.on(descriptor.name, handler);
};

const bootstrap = async (): Promise<void> => {
  logger.info({ env: env.NODE_ENV }, 'Iniciando Dedos Bot...');

  await ensureDatabaseConnection();

  registerEvent(readyEvent);
  registerEvent(interactionCreateEvent);

  logger.info({ commandCount: commandRegistry.size }, 'Comandos cargados en memoria.');

  try {
    await client.login(env.DISCORD_TOKEN);
    logger.info('Cliente autenticado correctamente.');
  } catch (error) {
    logger.fatal({ err: error }, 'No fue posible iniciar sesion en Discord.');
    await disconnectDatabase();
    process.exit(1);
  }
};

const shutdown = async (signal: NodeJS.Signals) => {
  logger.warn({ signal }, 'Recibida senal de apagado, iniciando cierre controlado.');

  try {
    await client.destroy();
    await disconnectDatabase();
    logger.info('Recursos liberados correctamente.');
  } catch (error) {
    logger.error({ err: error }, 'Error durante el proceso de apagado.');
  } finally {
    process.exit(0);
  }
};

process.on('SIGINT', (signal) => {
  void shutdown(signal);
});

process.on('SIGTERM', (signal) => {
  void shutdown(signal);
});

process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Promesa rechazada sin manejar.');
});

process.on('uncaughtException', (error) => {
  logger.error({ err: error }, 'Excepcion no controlada.');
});

void bootstrap().catch(async (error) => {
  logger.fatal({ err: error }, 'Fallo critico durante el arranque.');
  await prisma.$disconnect();
  process.exit(1);
});
