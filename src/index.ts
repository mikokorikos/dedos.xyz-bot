import 'dotenv/config';

import type { ClientEvents } from 'discord.js';
import { Client, GatewayIntentBits } from 'discord.js';

import { prisma } from '@/infrastructure/db/prisma';
import { commandRegistry } from '@/presentation/commands/command-registry';
import { type EventDescriptor, events } from '@/presentation/events';
import { env } from '@/shared/config/env';
import { logger } from '@/shared/logger/pino';

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const registerEvent = <K extends keyof ClientEvents>(descriptor: EventDescriptor<K>): void => {
  if (descriptor.once) {
    client.once(descriptor.name, (...args) => {
      void descriptor.execute(...args);
    });
    return;
  }

  client.on(descriptor.name, (...args) => {
    void descriptor.execute(...args);
  });
};

for (const event of events) {
  registerEvent(event);
}

const bootstrap = async () => {
  try {
    await prisma.$connect();
    logger.info('Conexión a la base de datos establecida');

    logger.info({ commands: commandRegistry.size }, 'Registrando listeners de comandos');

    await client.login(env.DISCORD_TOKEN);
  } catch (error) {
    logger.error({ err: error }, 'Fallo al iniciar el bot');
    await prisma.$disconnect();
    process.exit(1);
  }
};

const shutdown = async (signal: NodeJS.Signals) => {
  logger.info({ signal }, 'Recibida señal de apagado, cerrando recursos');
  await client.destroy();
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT', (signal) => {
  void shutdown(signal);
});

process.on('SIGTERM', (signal) => {
  void shutdown(signal);
});

process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Promesa no manejada');
});

process.on('uncaughtException', (error) => {
  logger.error({ err: error }, 'Excepción no controlada');
});

void bootstrap();
