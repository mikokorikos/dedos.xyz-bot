import { Events, type Interaction } from 'discord.js';

import { commandRegistry } from '@/presentation/commands/command-registry';
import { mapErrorToDiscordResponse } from '@/shared/errors/discord-error-mapper';
import { logger } from '@/shared/logger/pino';

export const interactionCreateEvent = {
  name: Events.InteractionCreate,
  once: false,
  async execute(interaction: Interaction): Promise<void> {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    const command = commandRegistry.get(interaction.commandName);

    if (!command) {
      logger.warn({ commandName: interaction.commandName }, 'Comando no registrado');
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      const { shouldLogStack, ...response } = mapErrorToDiscordResponse(error);
      const logPayload = { command: interaction.commandName, userId: interaction.user.id };

      if (shouldLogStack) {
        logger.error({ ...logPayload, err: error }, 'Error ejecutando comando');
      } else {
        logger.warn({ ...logPayload, err: error }, 'Error controlado ejecutando comando');
      }

      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(response);
      } else {
        await interaction.reply(response);
      }
    }
  },
};
