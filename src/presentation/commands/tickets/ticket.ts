// =============================================================================
// RUTA: src/presentation/commands/tickets/ticket.ts
// =============================================================================

import {
  ChannelType,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type TextChannel,
} from 'discord.js';

import { OpenGeneralTicketUseCase } from '@/application/usecases/tickets/OpenGeneralTicketUseCase';
import { CloseGeneralTicketUseCase } from '@/application/usecases/tickets/CloseGeneralTicketUseCase';
import { ListUserTicketsUseCase } from '@/application/usecases/tickets/ListUserTicketsUseCase';
import { TicketType } from '@/domain/entities/types';
import { prisma } from '@/infrastructure/db/prisma';
import { PrismaTicketRepository } from '@/infrastructure/repositories/PrismaTicketRepository';
import { PrismaTicketParticipantRepository } from '@/infrastructure/repositories/PrismaTicketParticipantRepository';
import { PrismaTicketPolicyRepository } from '@/infrastructure/repositories/PrismaTicketPolicyRepository';
import type { Command } from '@/presentation/commands/types';
import { buildTicketQuickOpenRow, registerTicketQuickOpenHandler } from '@/presentation/components/tickets/TicketQuickOpenSelect';
import { embedFactory } from '@/presentation/embeds/EmbedFactory';
import { TicketNotFoundError, UnauthorizedActionError } from '@/shared/errors/domain.errors';
import { logger } from '@/shared/logger/pino';

const ticketRepo = new PrismaTicketRepository(prisma);
const policyRepo = new PrismaTicketPolicyRepository(prisma);
const participantRepo = new PrismaTicketParticipantRepository(prisma);

const openUseCase = new OpenGeneralTicketUseCase(ticketRepo, policyRepo, participantRepo, prisma, logger, embedFactory);
const closeUseCase = new CloseGeneralTicketUseCase(ticketRepo, participantRepo, prisma, logger, embedFactory);
const listUseCase = new ListUserTicketsUseCase(ticketRepo, logger);

registerTicketQuickOpenHandler(openUseCase);

const ensureTextChannel = (interaction: ChatInputCommandInteraction): TextChannel => {
  if (!interaction.guild) {
    throw new UnauthorizedActionError('ticket:command:guild-only');
  }

  const channel = interaction.channel;
  if (!channel || channel.type !== ChannelType.GuildText) {
    throw new UnauthorizedActionError('ticket:command:channel');
  }

  return channel;
};

const handleOpen = async (interaction: ChatInputCommandInteraction): Promise<void> => {
  const guild = interaction.guild;
  if (!guild) {
    throw new UnauthorizedActionError('ticket:open:guild-only');
  }

  const type = interaction.options.getString('type', true) as TicketType;
  const context = interaction.options.getString('context', true);
  const partnerTag = interaction.options.getString('partner') ?? undefined;

  await interaction.deferReply({ ephemeral: true });
  const result = await openUseCase.execute(
    {
      userId: interaction.user.id,
      guildId: guild.id,
      type,
      context,
      partnerTag,
    },
    guild,
  );

  await interaction.editReply({
    embeds: [
      embedFactory.success({
        title: 'Ticket creado',
        description: `Se creó el ticket <#${result.channel.id}> para el tipo **${type}**.`,
      }),
    ],
    components: [buildTicketQuickOpenRow()],
  });
};

const handleClose = async (interaction: ChatInputCommandInteraction): Promise<void> => {
  const channel = ensureTextChannel(interaction);
  const ticket = await ticketRepo.findByChannelId(BigInt(channel.id));

  if (!ticket) {
    throw new TicketNotFoundError(channel.id);
  }

  await interaction.deferReply({ ephemeral: true });
  await closeUseCase.execute(ticket.id, interaction.user.id, channel);

  await interaction.editReply({
    embeds: [
      embedFactory.success({
        title: 'Ticket cerrado',
        description: 'El ticket se marcó como cerrado correctamente.',
      }),
    ],
  });
};

const handleList = async (interaction: ChatInputCommandInteraction): Promise<void> => {
  if (!interaction.guild) {
    throw new UnauthorizedActionError('ticket:list:guild-only');
  }

  await interaction.deferReply({ ephemeral: true });
  const tickets = await listUseCase.execute(interaction.user.id, 10);

  const openDescription = tickets.open.length
    ? tickets.open.map((ticket) => `• #${ticket.id} — **${ticket.type}** (${ticket.status})`).join('\n')
    : 'No tienes tickets abiertos.';

  const recentDescription = tickets.recent.length
    ? tickets.recent.map((ticket) => {
        const status = ticket.closedAt ? `cerrado el ${ticket.closedAt.toLocaleString('es-ES')}` : 'abierto';
        return `• #${ticket.id} — **${ticket.type}** (${status})`;
      }).join('\n')
    : 'No se encontraron tickets recientes.';

  await interaction.editReply({
    embeds: [
      embedFactory.info({
        title: 'Historial de tickets',
        fields: [
          { name: 'Abiertos', value: openDescription },
          { name: 'Recientes', value: recentDescription },
        ],
      }),
    ],
    components: [buildTicketQuickOpenRow()],
  });
};

export const ticketCommand: Command = {
  category: 'Tickets',
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Gestiona tickets generales de Dedos Shop')
    .addSubcommand((sub) =>
      sub
        .setName('open')
        .setDescription('Abre un nuevo ticket general')
        .addStringOption((option) =>
          option
            .setName('type')
            .setDescription('Tipo de ticket a crear')
            .setRequired(true)
            .addChoices(
              { name: 'Comprar', value: TicketType.BUY },
              { name: 'Vender', value: TicketType.SELL },
              { name: 'Robux', value: TicketType.ROBUX },
              { name: 'Nitro', value: TicketType.NITRO },
              { name: 'Decoración', value: TicketType.DECOR },
            ),
        )
        .addStringOption((option) =>
          option
            .setName('context')
            .setDescription('Describe brevemente qué necesitas')
            .setRequired(true)
            .setMinLength(10)
            .setMaxLength(1000),
        )
        .addStringOption((option) =>
          option
            .setName('partner')
            .setDescription('Menciona a la otra persona involucrada (opcional)')
            .setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('close')
        .setDescription('Cierra el ticket actual'),
    )
    .addSubcommand((sub) =>
      sub
        .setName('list')
        .setDescription('Consulta tus tickets abiertos y recientes'),
    ),
  execute: async (interaction) => {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'open') {
      await handleOpen(interaction);
      return;
    }

    if (subcommand === 'close') {
      await handleClose(interaction);
      return;
    }

    await handleList(interaction);
  },
  examples: [
    '/ticket open type:BUY context:"Busco comprar limiteds"',
    '/ticket close',
    '/ticket list',
  ],
};
