// =============================================================================
// RUTA: src/presentation/components/tickets/TicketQuickOpenSelect.ts
// =============================================================================

import { ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';

import type { OpenGeneralTicketUseCase } from '@/application/usecases/tickets/OpenGeneralTicketUseCase';
import { TicketType } from '@/domain/entities/types';
import { registerSelectMenuHandler } from '@/presentation/components/registry';
import { embedFactory } from '@/presentation/embeds/EmbedFactory';

const CUSTOM_ID = 'ticket:quick-open';

const QUICK_CONTEXT: Record<Exclude<TicketType, TicketType.MM>, string> = {
  [TicketType.BUY]: 'Ticket rápido de compra generado desde el selector.',
  [TicketType.SELL]: 'Ticket rápido de venta generado desde el selector.',
  [TicketType.ROBUX]: 'Ticket rápido de intercambio de Robux generado desde el selector.',
  [TicketType.NITRO]: 'Ticket rápido relacionado con Nitro generado desde el selector.',
  [TicketType.DECOR]: 'Ticket rápido de decoración generado desde el selector.',
};

export const buildTicketQuickOpenRow = () =>
  new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(CUSTOM_ID)
      .setPlaceholder('Abrir ticket rápido')
      .addOptions(
        { label: 'Comprar', description: 'Solicita asistencia para comprar', value: TicketType.BUY },
        { label: 'Vender', description: 'Publica una venta y recibe soporte', value: TicketType.SELL },
        { label: 'Robux', description: 'Gestiona intercambios de Robux', value: TicketType.ROBUX },
        { label: 'Nitro', description: 'Solicita soporte para Nitro', value: TicketType.NITRO },
        { label: 'Decoración', description: 'Canales de decoración y gráficos', value: TicketType.DECOR },
      ),
  );

export const registerTicketQuickOpenHandler = (useCase: OpenGeneralTicketUseCase): void => {
  registerSelectMenuHandler(CUSTOM_ID, async (interaction) => {
    if (!interaction.guild) {
      await interaction.reply({
        embeds: [
          embedFactory.error({
            title: 'Acción no disponible',
            description: 'Este selector solo funciona dentro de un servidor.',
          }),
        ],
        ephemeral: true,
      });
      return;
    }

    const selected = interaction.values[0] as Exclude<TicketType, TicketType.MM>;
    const context = QUICK_CONTEXT[selected];

    await interaction.deferReply({ ephemeral: true });
    const result = await useCase.execute(
      {
        userId: interaction.user.id,
        guildId: interaction.guild.id,
        type: selected,
        context,
      },
      interaction.guild,
    );

    await interaction.editReply({
      embeds: [
        embedFactory.success({
          title: 'Ticket creado',
          description: `Se creó el ticket <#${result.channel.id}> con el tipo **${selected}**.`,
        }),
      ],
    });
  });
};
