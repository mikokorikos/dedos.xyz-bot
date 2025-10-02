// ============================================================================
// RUTA: src/application/orchestrators/messageReactionAddOrchestrator.ts
// ============================================================================

import type { MessageReaction, PartialMessageReaction, PartialUser, User } from 'discord.js';

import { logger } from '@/shared/logger/pino';

export const handleMessageReactionAdd = async (
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser,
): Promise<void> => {
  if (user.bot) {
    return;
  }

  const emojiIdentifier = reaction.emoji.id ?? reaction.emoji.name;

  logger.debug(
    {
      emoji: emojiIdentifier,
      messageId: reaction.message?.id,
      channelId: reaction.message?.channelId,
      userId: user.id,
    },
    'Reacción registrada correctamente.',
  );
};
