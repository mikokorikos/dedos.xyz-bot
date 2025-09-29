// ============================================================================
// RUTA: src/presentation/commands/general/ping.ts
// ============================================================================

import { SlashCommandBuilder } from 'discord.js';

import type { Command } from '@/presentation/commands/types';
import { embedFactory } from '@/presentation/embeds/EmbedFactory';
import { COOLDOWNS } from '@/shared/config/constants';
import { logger } from '@/shared/logger/pino';

export const pingCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Verifica la latencia del bot y la conexión con Discord.'),
  category: 'General',
  examples: ['/ping'],
  cooldownKey: 'ping',
  async execute(interaction) {
    const interactionLatency = Date.now() - interaction.createdTimestamp;
    const websocketLatency = Math.round(interaction.client.ws.ping);

    logger.debug({ interactionLatency, websocketLatency }, 'Ping ejecutado');

    await interaction.reply({
      embeds: [
        embedFactory.success({
          title: '🏓 Pong!',
          description: `Latencia REST: **${interactionLatency} ms**\nLatencia WebSocket: **${websocketLatency} ms**`,
          footer: `Próxima actualización disponible en ${COOLDOWNS.ping / 1000}s`,
        }),
      ],
      ephemeral: true,
    });
  },
};
