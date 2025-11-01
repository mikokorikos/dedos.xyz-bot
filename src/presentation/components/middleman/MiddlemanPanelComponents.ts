// =============================================================================
// RUTA: src/presentation/components/middleman/MiddlemanPanelComponents.ts
// =============================================================================

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type InteractionReplyOptions,
  StringSelectMenuBuilder,
} from 'discord.js';

import type { MiddlemanPanelViewModel } from '@/application/usecases/middleman/RenderPanelUseCase';

const PANEL_PREFIX = 'mm:panel';

const buildStatusSummary = (viewModel: MiddlemanPanelViewModel): string => {
  const { statusCounters } = viewModel;

  const segments = Object.entries(statusCounters)
    .map(([status, count]) => `• **${status}**: ${count}`)
    .join('\n');

  return segments || 'No hay transacciones registradas en el ticket.';
};

export const buildMiddlemanPanelResponse = (
  viewModel: MiddlemanPanelViewModel,
): InteractionReplyOptions => {
  const embedDescription = buildStatusSummary(viewModel);
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`${PANEL_PREFIX}:toggle|${viewModel.ticketId}`)
    .setPlaceholder('Selecciona tu transacción para confirmar/cancelar')
    .setMinValues(1)
    .setMaxValues(1);

  if (viewModel.trades.length === 0) {
    selectMenu.setPlaceholder('No hay transacciones registradas').setDisabled(true);
  } else {
    for (const trade of viewModel.trades) {
      selectMenu.addOptions({
        label: `${trade.robloxUsername} • ${trade.status}`,
        value: trade.id.toString(),
        description: `Items: ${trade.items.length} • Confirmaciones: ${trade.participantConfirmations.length}`,
      });
    }
  }

  const actionButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`${PANEL_PREFIX}:refresh|${viewModel.ticketId}`)
      .setLabel('Actualizar panel')
      .setEmoji('🔁')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`${PANEL_PREFIX}:finalization|${viewModel.ticketId}`)
      .setLabel('Enviar resumen')
      .setEmoji('📦')
      .setDisabled(viewModel.trades.length === 0)
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`${PANEL_PREFIX}:request-review|${viewModel.ticketId}`)
      .setLabel('Recordar reseña')
      .setEmoji('⭐')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`${PANEL_PREFIX}:force-close|${viewModel.ticketId}`)
      .setLabel('Cierre forzoso')
      .setEmoji('🛑')
      .setStyle(ButtonStyle.Danger),
  );

  const components = [
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu),
    actionButtons,
  ];

  return {
    embeds: [
      {
        title: `Panel de middleman • Ticket #${viewModel.ticketId}`,
        description: embedDescription,
        fields: viewModel.trades.map((trade) => ({
          name: `Participante • ${trade.robloxUsername}`,
          value:
            trade.participantConfirmations.length === 0
              ? 'Nadie ha confirmado aún.'
              : trade.participantConfirmations
                  .map((confirmation) => `• <@${confirmation.userId}> — ${confirmation.confirmedAt.toLocaleString('es-ES')}`)
                  .join('\n'),
        })),
        footer: {
          text: viewModel.forcedClose ? 'El ticket fue cerrado forzosamente.' : 'Panel en vivo del sistema de middleman.',
        },
      },
    ],
    components,
    ephemeral: true,
  };
};
