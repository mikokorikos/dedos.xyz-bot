import type { Client } from 'discord.js';
import { Events } from 'discord.js';

import { logger } from '@/shared/logger/pino';

export const readyEvent = {
  name: Events.ClientReady,
  once: true,
  execute(client: Client<true>): void {
    logger.info({ tag: client.user.tag }, 'Bot iniciado correctamente');
  },
};
