// ============================================================================
// RUTA: src/presentation/components/modals/MiddlemanModal.ts
// ============================================================================

import {
  ActionRowBuilder,
  ModalBuilder,
  type ModalSubmitInteraction,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';

import type { OpenMiddlemanChannelUseCase } from '@/application/usecases/middleman/OpenMiddlemanChannelUseCase';
import { embedFactory } from '@/presentation/embeds/EmbedFactory';
import { mapErrorToDiscordResponse } from '@/shared/errors/discord-error-mapper';
import { logger } from '@/shared/logger/pino';

const CONTEXT_ID = 'context';
const PARTNER_ID = 'partner';
const ROBLOX_ID = 'roblox';

export class MiddlemanModal {
  public static build(): ModalBuilder {
    return new ModalBuilder()
      .setCustomId('middleman-open')
      .setTitle('Abrir Ticket de Middleman')
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId(CONTEXT_ID)
            .setLabel('Descripción del trade')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Describe qué necesitas...')
            .setRequired(true)
            .setMinLength(10)
            .setMaxLength(1000),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId(PARTNER_ID)
            .setLabel('Compañero (mención o ID)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setMaxLength(100),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId(ROBLOX_ID)
            .setLabel('Usuario de Roblox (opcional)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setMaxLength(50),
        ),
      );
  }

  public static async handleSubmit(
    interaction: ModalSubmitInteraction,
    useCase: OpenMiddlemanChannelUseCase,
  ): Promise<void> {
    if (!interaction.guild) {
      await interaction.reply({
        embeds: [
          embedFactory.error({
            title: 'Acción no disponible',
            description: 'Este formulario solo puede utilizarse dentro de un servidor de Discord.',
          }),
        ],
        ephemeral: true,
      });
      return;
    }

    const context = interaction.fields.getTextInputValue(CONTEXT_ID);
    const partnerTag = interaction.fields.getTextInputValue(PARTNER_ID) || undefined;
    const robloxUsername = interaction.fields.getTextInputValue(ROBLOX_ID) || undefined;

    await interaction.deferReply({ ephemeral: true });

    try {
      const { ticket, channel } = await useCase.execute(
        {
          userId: interaction.user.id,
          guildId: interaction.guild.id,
          type: 'MM',
          context,
          partnerTag,
          robloxUsername,
        },
        interaction.guild,
      );

      await interaction.editReply({
        embeds: [
          embedFactory.success({
            title: 'Ticket creado',
            description: `Tu ticket #${ticket.id} fue creado correctamente en ${channel.toString()}.`,
          }),
        ],
      });
    } catch (error) {
      const { shouldLogStack, referenceId, embeds, ...messagePayload } = mapErrorToDiscordResponse(error);

      const logPayload = { err: error, referenceId };
      if (shouldLogStack) {
        logger.error(logPayload, 'Error al crear ticket de middleman.');
      } else {
        logger.warn(logPayload, 'Error controlado al crear ticket de middleman.');
      }

      const payload = {
        ...messagePayload,
        embeds:
          embeds ?? [
            embedFactory.error({
              title: 'No se pudo crear el ticket',
              description:
                'Ocurrió un error durante el proceso de creación. Verifica que cumples los requisitos e inténtalo nuevamente.',
            }),
          ],
      };

      if (interaction.deferred || interaction.replied) {
        const { ephemeral, flags, ...editPayload } = payload;
        await interaction.editReply(editPayload);
      } else {
        await interaction.reply(payload);
      }
    }
  }
}
