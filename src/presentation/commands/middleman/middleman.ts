// ============================================================================
// RUTA: src/presentation/commands/middleman/middleman.ts
// ============================================================================

import { ChannelType, type ChatInputCommandInteraction, SlashCommandBuilder, type TextChannel } from 'discord.js';

import { ClaimTradeUseCase } from '@/application/usecases/middleman/ClaimTradeUseCase';
import { CloseTradeUseCase } from '@/application/usecases/middleman/CloseTradeUseCase';
import { OpenMiddlemanChannelUseCase } from '@/application/usecases/middleman/OpenMiddlemanChannelUseCase';
import { SubmitReviewUseCase } from '@/application/usecases/middleman/SubmitReviewUseCase';
import { prisma } from '@/infrastructure/db/prisma';
import { PrismaMemberStatsRepository } from '@/infrastructure/repositories/PrismaMemberStatsRepository';
import { PrismaMiddlemanRepository } from '@/infrastructure/repositories/PrismaMiddlemanRepository';
import { PrismaReviewRepository } from '@/infrastructure/repositories/PrismaReviewRepository';
import { PrismaTicketRepository } from '@/infrastructure/repositories/PrismaTicketRepository';
import { PrismaTradeRepository } from '@/infrastructure/repositories/PrismaTradeRepository';
import type { Command } from '@/presentation/commands/types';
import { MiddlemanModal } from '@/presentation/components/modals/MiddlemanModal';
import { registerModalHandler } from '@/presentation/components/registry';
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

export const middlemanCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('middleman')
    .setDescription('Sistema de middleman del servidor')
    .addSubcommand((sub) => sub.setName('open').setDescription('Abrir ticket de middleman'))
    .addSubcommand((sub) => sub.setName('claim').setDescription('Reclamar ticket (solo middlemen)'))
    .addSubcommand((sub) => sub.setName('close').setDescription('Cerrar ticket (solo middleman asignado)')),
  category: 'Middleman',
  examples: ['/middleman open', '/middleman claim', '/middleman close'],
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
