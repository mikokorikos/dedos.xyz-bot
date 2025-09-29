import { SlashCommandBuilder } from 'discord.js';

import type { Command } from '@/presentation/commands/types';
import { embedFactory } from '@/presentation/embeds/EmbedFactory';
import { logger } from '@/shared/logger/pino';

export const pingCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Verifica la latencia del bot y de la conexión con Discord.'),
  async execute(interaction) {
    const latency = Date.now() - interaction.createdTimestamp;
    const websocketLatency = Math.round(interaction.client.ws.ping);

    logger.debug({ latency, websocketLatency }, 'Ping command executed');

    await interaction.reply({
      embeds: [
        embedFactory.success({
          title: '🏓 Pong!',
          description: `Latencia REST: **${latency}ms**\nLatencia WebSocket: **${websocketLatency}ms**`,
        }),
      ],
      ephemeral: true,
    });
  },
};
