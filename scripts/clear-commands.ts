import 'dotenv/config';

import { REST, Routes } from 'discord.js';

import { env } from '@/shared/config/env';
import { logger } from '@/shared/logger/pino';

const rest = new REST({ version: '10' }).setToken(env.DISCORD_TOKEN);

const clearCommands = async () => {
  const route = env.DISCORD_GUILD_ID
    ? Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DISCORD_GUILD_ID)
    : Routes.applicationCommands(env.DISCORD_CLIENT_ID);

  try {
    await rest.put(route, { body: [] });
    logger.warn({ scope: env.DISCORD_GUILD_ID ? 'guild' : 'global' }, 'Se limpiaron todos los comandos registrados');
  } catch (error) {
    logger.error({ err: error }, 'Error limpiando comandos');
    process.exitCode = 1;
  }
};

void clearCommands().finally(() => {
  logger.info('Proceso de limpieza finalizado');
});
