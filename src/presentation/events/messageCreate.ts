// ============================================================================
// RUTA: src/presentation/events/messageCreate.ts
// ============================================================================

import type { Message } from 'discord.js';
import { Events } from 'discord.js';

import { handleMessageCreate } from '@/application/orchestrators/messageCreateOrchestrator';
import type { EventDescriptor } from '@/presentation/events/types';

export const messageCreateEvent: EventDescriptor<typeof Events.MessageCreate> = {
  name: Events.MessageCreate,
  once: false,
  async execute(message: Message): Promise<void> {
    await handleMessageCreate(message);
  },
};
