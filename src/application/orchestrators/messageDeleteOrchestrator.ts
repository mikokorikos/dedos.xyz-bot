// ============================================================================
// RUTA: src/application/orchestrators/messageDeleteOrchestrator.ts
// ============================================================================

import type { Message, PartialMessage } from 'discord.js';

import { logger } from '@/shared/logger/pino';

export const handleMessageDelete = async (message: Message | PartialMessage): Promise<void> => {
  const baseLog = {
    messageId: message.id,
    channelId: message.channelId,
    guildId: message.guildId,
  } as const;

  if (message.partial) {
    logger.warn(baseLog, 'Se eliminó un mensaje parcial (sin contenido en caché).');
    return;
  }

  logger.info(
    {
      ...baseLog,
      authorId: message.author?.id,
      hadAttachments: message.attachments.size > 0,
    },
    'Mensaje eliminado registrado.',
  );
};
