// ============================================================================
// RUTA: src/presentation/events/messageDelete.ts
// ============================================================================

import type { Message, PartialMessage } from 'discord.js';
import { Events } from 'discord.js';

import { handleMessageDelete } from '@/application/orchestrators/messageDeleteOrchestrator';
import type { EventDescriptor } from '@/presentation/events/types';

export const messageDeleteEvent: EventDescriptor<typeof Events.MessageDelete> = {
  name: Events.MessageDelete,
  once: false,
  async execute(message: Message | PartialMessage): Promise<void> {
    await handleMessageDelete(message);
  },
};
