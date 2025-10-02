// ============================================================================
// RUTA: src/presentation/commands/middleman/middleman.ts
// ============================================================================

import {
  ChannelType,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
  type StringSelectMenuInteraction,
  type TextChannel,
} from 'discord.js';

import { ClaimTradeUseCase } from '@/application/usecases/middleman/ClaimTradeUseCase';
import { CloseTradeUseCase } from '@/application/usecases/middleman/CloseTradeUseCase';
import { ForceCloseUseCase } from '@/application/usecases/middleman/ForceCloseUseCase';
import { OpenMiddlemanChannelUseCase } from '@/application/usecases/middleman/OpenMiddlemanChannelUseCase';
import { RenderPanelUseCase } from '@/application/usecases/middleman/RenderPanelUseCase';
import { RequestReviewUseCase } from '@/application/usecases/middleman/RequestReviewUseCase';
import { SendFinalizationUseCase } from '@/application/usecases/middleman/SendFinalizationUseCase';
import { SubmitReviewUseCase } from '@/application/usecases/middleman/SubmitReviewUseCase';
import { ToggleConfirmationUseCase } from '@/application/usecases/middleman/ToggleConfirmationUseCase';
import { prisma } from '@/infrastructure/db/prisma';
import { PrismaMemberStatsRepository } from '@/infrastructure/repositories/PrismaMemberStatsRepository';
import { PrismaMiddlemanRepository } from '@/infrastructure/repositories/PrismaMiddlemanRepository';
import { PrismaReviewRepository } from '@/infrastructure/repositories/PrismaReviewRepository';
import { PrismaTicketRepository } from '@/infrastructure/repositories/PrismaTicketRepository';
import { PrismaTradeRepository } from '@/infrastructure/repositories/PrismaTradeRepository';
import type { Command } from '@/presentation/commands/types';
import { MiddlemanModal } from '@/presentation/components/modals/MiddlemanModal';
import { buildMiddlemanPanelResponse } from '@/presentation/components/middleman/MiddlemanPanelComponents';
import { registerButtonHandler, registerModalHandler, registerSelectMenuHandler } from '@/presentation/components/registry';
import { embedFactory } from '@/presentation/embeds/EmbedFactory';
import { TicketNotFoundError, UnauthorizedActionError } from '@/shared/errors/domain.errors';
import { logger } from '@/shared/logger/pino';

const ticketRepo = new PrismaTicketRepository(prisma);
const tradeRepo = new PrismaTradeRepository(prisma);
const statsRepo = new PrismaMemberStatsRepository(prisma);
const middlemanRepo = new PrismaMiddlemanRepository(prisma);
const reviewRepo = new PrismaReviewRepository(prisma);

const openUseCase = new OpenMiddlemanChannelUseCase(ticketRepo, logger, embedFactory);
const claimUseCase = new ClaimTradeUseCase(ticketRepo, middlemanRepo, logger, embedFactory);
const closeUseCase = new CloseTradeUseCase(ticketRepo, tradeRepo, statsRepo, middlemanRepo, prisma, logger, embedFactory);
const submitReviewUseCase = new SubmitReviewUseCase(reviewRepo, ticketRepo, embedFactory, logger);
const renderPanelUseCase = new RenderPanelUseCase(ticketRepo, tradeRepo, middlemanRepo, logger);
const toggleConfirmationUseCase = new ToggleConfirmationUseCase(ticketRepo, tradeRepo, middlemanRepo, logger);
const forceCloseUseCase = new ForceCloseUseCase(ticketRepo, tradeRepo, middlemanRepo, prisma, logger, embedFactory);
const sendFinalizationUseCase = new SendFinalizationUseCase(ticketRepo, tradeRepo, middlemanRepo, logger, embedFactory);
const requestReviewUseCase = new RequestReviewUseCase(ticketRepo, middlemanRepo, logger, embedFactory);

registerModalHandler('middleman-open', async (interaction) => {
  await MiddlemanModal.handleSubmit(interaction, openUseCase);
});

const ensureTextChannel = (interaction: ChatInputCommandInteraction): TextChannel => {
  if (!interaction.guild) {
    throw new UnauthorizedActionError('middleman:command:guild-only');
  }

  const channel = interaction.channel;

  if (!channel || channel.type !== ChannelType.GuildText) {
    throw new UnauthorizedActionError('middleman:command:channel');
  }

  return channel;
};

const ensureTextChannelFromInteraction = (interaction: ButtonInteraction | StringSelectMenuInteraction): TextChannel => {
  const channel = interaction.channel;

  if (!channel || channel.type !== ChannelType.GuildText) {
    throw new UnauthorizedActionError('middleman:command:channel');
  }

  return channel;
};

const refreshPanel = async (
  interaction: ButtonInteraction | StringSelectMenuInteraction,
  ticketId: number,
): Promise<void> => {
  const panel = await renderPanelUseCase.execute(ticketId, BigInt(interaction.user.id));
  const response = buildMiddlemanPanelResponse(panel);
  await interaction.editReply({ embeds: response.embeds, components: response.components });
};

const handleOpen = async (interaction: ChatInputCommandInteraction): Promise<void> => {
  if (!interaction.guild) {
    await interaction.reply({
      embeds: [
        embedFactory.error({
          title: 'Acción no disponible',
          description: 'Este comando solo puede utilizarse dentro de un servidor.',
        }),
      ],
      ephemeral: true,
    });
    return;
  }

  await interaction.showModal(MiddlemanModal.build());
};

const handleClaim = async (interaction: ChatInputCommandInteraction): Promise<void> => {
  const channel = ensureTextChannel(interaction);
  const ticket = await ticketRepo.findByChannelId(BigInt(channel.id));

  if (!ticket) {
    throw new TicketNotFoundError(channel.id);
  }

  await interaction.deferReply({ ephemeral: true });
  await claimUseCase.execute({ ticketId: ticket.id, middlemanId: interaction.user.id }, channel);

  await interaction.editReply({
    embeds: [
      embedFactory.success({
        title: 'Ticket reclamado',
        description: 'Ahora tienes control del ticket. Continúa con el flujo de validación en el canal.',
      }),
    ],
  });
};

const handleClose = async (interaction: ChatInputCommandInteraction): Promise<void> => {
  const channel = ensureTextChannel(interaction);
  const ticket = await ticketRepo.findByChannelId(BigInt(channel.id));

  if (!ticket) {
    throw new TicketNotFoundError(channel.id);
  }

  await interaction.deferReply({ ephemeral: true });
  await closeUseCase.execute(ticket.id, BigInt(interaction.user.id), channel);

  await interaction.editReply({
    embeds: [
      embedFactory.success({
        title: 'Ticket cerrado',
        description: 'El ticket se ha cerrado correctamente y se solicitó la reseña a los participantes.',
      }),
    ],
  });
};

const handlePanel = async (interaction: ChatInputCommandInteraction): Promise<void> => {
  const channel = ensureTextChannel(interaction);
  const ticket = await ticketRepo.findByChannelId(BigInt(channel.id));

  if (!ticket) {
    throw new TicketNotFoundError(channel.id);
  }

  await interaction.deferReply({ ephemeral: true });
  const panel = await renderPanelUseCase.execute(ticket.id, BigInt(interaction.user.id));
  const response = buildMiddlemanPanelResponse(panel);
  await interaction.editReply(response);
};

const handleStats = async (interaction: ChatInputCommandInteraction): Promise<void> => {
  const channel = ensureTextChannel(interaction);
  const ticket = await ticketRepo.findByChannelId(BigInt(channel.id));

  if (!ticket) {
    throw new TicketNotFoundError(channel.id);
  }

  await interaction.deferReply({ ephemeral: true });
  const panel = await renderPanelUseCase.execute(ticket.id, BigInt(interaction.user.id));

  const counters = Object.entries(panel.statusCounters)
    .map(([status, count]) => `• **${status}**: ${count}`)
    .join('\n');

  await interaction.editReply({
    embeds: [
      embedFactory.info({
        title: `Estadísticas del ticket #${panel.ticketId}`,
        description: counters || 'No hay transacciones registradas.',
      }),
    ],
  });
};

const handleRequestReview = async (interaction: ChatInputCommandInteraction): Promise<void> => {
  const channel = ensureTextChannel(interaction);
  const ticket = await ticketRepo.findByChannelId(BigInt(channel.id));

  if (!ticket) {
    throw new TicketNotFoundError(channel.id);
  }

  await interaction.deferReply({ ephemeral: true });
  await requestReviewUseCase.execute(ticket.id, BigInt(interaction.user.id), channel);

  await interaction.editReply({
    embeds: [
      embedFactory.success({
        title: 'Recordatorio enviado',
        description: 'Se solicitó nuevamente la reseña a los participantes del ticket.',
      }),
    ],
  });
};

const handleForceClose = async (interaction: ChatInputCommandInteraction): Promise<void> => {
  const channel = ensureTextChannel(interaction);
  const ticket = await ticketRepo.findByChannelId(BigInt(channel.id));

  if (!ticket) {
    throw new TicketNotFoundError(channel.id);
  }

  await interaction.deferReply({ ephemeral: true });
  await forceCloseUseCase.execute(ticket.id, BigInt(interaction.user.id), channel);

  await interaction.editReply({
    embeds: [
      embedFactory.warning({
        title: 'Ticket cerrado forzosamente',
        description: 'El ticket fue cerrado manualmente. Se notificó en el canal del ticket.',
      }),
    ],
  });
};

registerSelectMenuHandler('mm:panel:toggle', async (interaction: StringSelectMenuInteraction) => {
  const [, ticketIdRaw] = interaction.customId.split('|');
  const tradeIdRaw = interaction.values.at(0);

  if (!tradeIdRaw || !ticketIdRaw) {
    await interaction.reply({
      embeds: [
        embedFactory.error({
          title: 'Selección inválida',
          description: 'No se pudo determinar la transacción seleccionada. Recarga el panel.',
        }),
      ],
      ephemeral: true,
    });
    return;
  }

  await interaction.deferUpdate();
  const result = await toggleConfirmationUseCase.execute(Number(tradeIdRaw), BigInt(interaction.user.id));
  await refreshPanel(interaction, Number(ticketIdRaw));

  await interaction.followUp({
    embeds: [
      embedFactory.success({
        title: result.confirmed ? 'Confirmación registrada' : 'Confirmación retirada',
        description: 'Tu respuesta fue almacenada correctamente.',
      }),
    ],
    ephemeral: true,
  });
});

registerButtonHandler('mm:panel:refresh', async (interaction: ButtonInteraction) => {
  const [, ticketIdRaw] = interaction.customId.split('|');

  if (!ticketIdRaw) {
    await interaction.reply({
      embeds: [
        embedFactory.error({
          title: 'Acción inválida',
          description: 'No se pudo identificar el ticket asociado al panel.',
        }),
      ],
      ephemeral: true,
    });
    return;
  }

  await interaction.deferUpdate();
  await refreshPanel(interaction, Number(ticketIdRaw));

  await interaction.followUp({
    embeds: [
      embedFactory.info({
        title: 'Panel actualizado',
        description: 'Los datos del ticket fueron sincronizados.',
      }),
    ],
    ephemeral: true,
  });
});

registerButtonHandler('mm:panel:finalization', async (interaction: ButtonInteraction) => {
  const [, ticketIdRaw] = interaction.customId.split('|');

  if (!ticketIdRaw) {
    await interaction.reply({
      embeds: [
        embedFactory.error({
          title: 'Acción inválida',
          description: 'No se pudo identificar el ticket asociado al panel.',
        }),
      ],
      ephemeral: true,
    });
    return;
  }

  await interaction.deferUpdate();
  const channel = ensureTextChannelFromInteraction(interaction);
  await sendFinalizationUseCase.execute(Number(ticketIdRaw), BigInt(interaction.user.id), channel);
  await refreshPanel(interaction, Number(ticketIdRaw));

  await interaction.followUp({
    embeds: [
      embedFactory.success({
        title: 'Resumen enviado',
        description: 'Se publicó el resumen de confirmaciones en el canal del ticket.',
      }),
    ],
    ephemeral: true,
  });
});

registerButtonHandler('mm:panel:request-review', async (interaction: ButtonInteraction) => {
  const [, ticketIdRaw] = interaction.customId.split('|');

  if (!ticketIdRaw) {
    await interaction.reply({
      embeds: [
        embedFactory.error({
          title: 'Acción inválida',
          description: 'No se pudo identificar el ticket asociado al panel.',
        }),
      ],
      ephemeral: true,
    });
    return;
  }

  await interaction.deferUpdate();
  const channel = ensureTextChannelFromInteraction(interaction);
  await requestReviewUseCase.execute(Number(ticketIdRaw), BigInt(interaction.user.id), channel);
  await refreshPanel(interaction, Number(ticketIdRaw));

  await interaction.followUp({
    embeds: [
      embedFactory.info({
        title: 'Recordatorio enviado',
        description: 'Se notificó a los participantes para que registren su reseña.',
      }),
    ],
    ephemeral: true,
  });
});

registerButtonHandler('mm:panel:force-close', async (interaction: ButtonInteraction) => {
  const [, ticketIdRaw] = interaction.customId.split('|');

  if (!ticketIdRaw) {
    await interaction.reply({
      embeds: [
        embedFactory.error({
          title: 'Acción inválida',
          description: 'No se pudo identificar el ticket asociado al panel.',
        }),
      ],
      ephemeral: true,
    });
    return;
  }

  await interaction.deferUpdate();
  const channel = ensureTextChannelFromInteraction(interaction);
  await forceCloseUseCase.execute(Number(ticketIdRaw), BigInt(interaction.user.id), channel);
  await refreshPanel(interaction, Number(ticketIdRaw));

  await interaction.followUp({
    embeds: [
      embedFactory.warning({
        title: 'Ticket cerrado',
        description: 'Se ejecutó el cierre forzoso del ticket.',
      }),
    ],
    ephemeral: true,
  });
});

export const middlemanCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('middleman')
    .setDescription('Sistema de middleman del servidor')
    .addSubcommand((sub) => sub.setName('open').setDescription('Abrir ticket de middleman'))
    .addSubcommand((sub) => sub.setName('claim').setDescription('Reclamar ticket (solo middlemen)'))
    .addSubcommand((sub) => sub.setName('close').setDescription('Cerrar ticket (solo middleman asignado)'))
    .addSubcommand((sub) => sub.setName('panel').setDescription('Mostrar panel interactivo del ticket'))
    .addSubcommand((sub) => sub.setName('stats').setDescription('Mostrar resumen de estados de las transacciones'))
    .addSubcommand((sub) => sub.setName('review').setDescription('Reenviar recordatorio de reseña'))
    .addSubcommand((sub) => sub.setName('force-close').setDescription('Cerrar ticket forzosamente (solo middleman)')),
  category: 'Middleman',
  examples: [
    '/middleman open',
    '/middleman claim',
    '/middleman close',
    '/middleman panel',
    '/middleman stats',
    '/middleman review',
    '/middleman force-close',
  ],
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'open':
        await handleOpen(interaction);
        break;
      case 'claim':
        await handleClaim(interaction);
        break;
      case 'close':
        await handleClose(interaction);
        break;
      case 'panel':
        await handlePanel(interaction);
        break;
      case 'stats':
        await handleStats(interaction);
        break;
      case 'review':
        await handleRequestReview(interaction);
        break;
      case 'force-close':
        await handleForceClose(interaction);
        break;
      default:
        await interaction.reply({
          embeds: [
            embedFactory.error({
              title: 'Subcomando no disponible',
              description: 'La acción solicitada no está implementada.',
            }),
          ],
          ephemeral: true,
        });
    }
  },
};

export const middlemanReviewUseCase = submitReviewUseCase;
