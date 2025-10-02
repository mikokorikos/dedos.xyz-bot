// ============================================================================
// RUTA: src/application/orchestrators/messageCreateOrchestrator.ts
// ============================================================================

import type { Message } from 'discord.js';

import { MESSAGE_PREFIXES } from '@/shared/config/constants';
import { messageGuards } from '@/shared/guards/message-guards';
import { logger } from '@/shared/logger/pino';

const PREFIX_COOLDOWN_BUCKET = 'legacy-prefix';
const PREFIX_COOLDOWN_MS = 3_000;

export const handleMessageCreate = async (message: Message): Promise<void> => {
  if (message.author.bot) {
    return;
  }

  const content = message.content ?? '';

  if (!messageGuards.hasValidPrefix({ prefixes: MESSAGE_PREFIXES, content })) {
    return;
  }

  const cooldownResult = messageGuards.registerCooldown({
    bucket: PREFIX_COOLDOWN_BUCKET,
    userId: message.author.id,
    durationMs: PREFIX_COOLDOWN_MS,
  });

  if (!cooldownResult.allowed) {
    const remainingSeconds = Math.max(1, Math.ceil((cooldownResult.remainingMs ?? 0) / 1_000));
    await message.reply(
      `Debes esperar ${remainingSeconds} segundo${remainingSeconds === 1 ? '' : 's'} antes de reutilizar comandos de prefijo.`,
    );
    return;
  }

  const spamResult = messageGuards.detectSpam({
    userId: message.author.id,
    content,
  });

  if (spamResult.isSpam) {
    logger.warn(
      {
        userId: message.author.id,
        channelId: message.channelId,
        reason: spamResult.reason,
        occurrences: spamResult.occurrences,
      },
      'Mensaje bloqueado por protección anti-spam.',
    );

    await message.reply('Tu mensaje fue bloqueado por el sistema anti-spam. Intenta nuevamente en unos segundos.');
    return;
  }

  logger.info(
    {
      userId: message.author.id,
      channelId: message.channelId,
      guildId: message.guildId,
      content,
    },
    'Comando de prefijo recibido y validado.',
  );
};
