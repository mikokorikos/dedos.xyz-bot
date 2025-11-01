// ============================================================================
// RUTA: src/application/orchestrators/guildMemberAddOrchestrator.ts
// ============================================================================

import type { GuildMember } from 'discord.js';

import { logger } from '@/shared/logger/pino';

export const handleGuildMemberAdd = async (member: GuildMember): Promise<void> => {
  logger.info(
    {
      userId: member.id,
      guildId: member.guild.id,
      joinedAt: member.joinedTimestamp,
    },
    'Nuevo miembro detectado en el servidor.',
  );
};
