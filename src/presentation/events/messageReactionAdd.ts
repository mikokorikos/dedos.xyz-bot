// ============================================================================
// RUTA: src/presentation/events/messageReactionAdd.ts
// ============================================================================

import type { MessageReaction, PartialMessageReaction, PartialUser, User } from 'discord.js';
import { Events } from 'discord.js';

import { handleMessageReactionAdd } from '@/application/orchestrators/messageReactionAddOrchestrator';
import type { EventDescriptor } from '@/presentation/events/types';

export const messageReactionAddEvent: EventDescriptor<typeof Events.MessageReactionAdd> = {
  name: Events.MessageReactionAdd,
  once: false,
  async execute(
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser,
  ): Promise<void> {
    await handleMessageReactionAdd(reaction, user);
  },
};
