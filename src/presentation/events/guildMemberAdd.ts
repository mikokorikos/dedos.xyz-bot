// ============================================================================
// RUTA: src/presentation/events/guildMemberAdd.ts
// ============================================================================

import type { GuildMember } from 'discord.js';
import { Events } from 'discord.js';

import { handleGuildMemberAdd } from '@/application/orchestrators/guildMemberAddOrchestrator';
import type { EventDescriptor } from '@/presentation/events/types';

export const guildMemberAddEvent: EventDescriptor<typeof Events.GuildMemberAdd> = {
  name: Events.GuildMemberAdd,
  once: false,
  async execute(member: GuildMember): Promise<void> {
    await handleGuildMemberAdd(member);
  },
};
