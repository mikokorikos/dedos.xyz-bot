// =============================================================================
// RUTA: src/presentation/commands/tickets/ticket.ts
// =============================================================================

import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  ChannelType,
  PermissionFlagsBits,
} from 'discord.js';

import {
  type CloseGeneralTicketDTO,
  type CreateGeneralTicketDTO,
  type ListUserTicketsDTO,
} from '@/application/dto/ticket.dto';
import { CloseGeneralTicketUseCase } from '@/application/usecases/tickets/CloseGeneralTicketUseCase';
import { ListUserTicketsUseCase } from '@/application/usecases/tickets/ListUserTicketsUseCase';
import { OpenGeneralTicketUseCase } from '@/application/usecases/tickets/OpenGeneralTicketUseCase';
import { prisma } from '@/infrastructure/db/prisma';
import { PrismaTicketParticipantRepository } from '@/infrastructure/repositories/PrismaTicketParticipantRepository';
import { PrismaTicketRepository } from '@/infrastructure/repositories/PrismaTicketRepository';
import { PrismaTicketTypePolicyRepository } from '@/infrastructure/repositories/PrismaTicketTypePolicyRepository';
import { TicketShortcutSelect } from '@/presentation/components/selects/TicketShortcutSelect';
import type { Command } from '@/presentation/commands/types';
import { embedFactory } from '@/presentation/embeds/EmbedFactory';
import { UnauthorizedActionError } from '@/shared/errors/domain.errors';
import { logger } from '@/shared/logger/pino';

const ticketRepo = new PrismaTicketRepository(prisma);
const participantRepo = new PrismaTicketParticipantRepository(prisma);
const policyRepo = new PrismaTicketTypePolicyRepository(prisma);

const openUseCase = new OpenGeneralTicketUseCase(
  prisma,
  ticketRepo,
  participantRepo,
  policyRepo,
  logger,
  embedFactory,
);
const closeUseCase = new CloseGeneralTicketUseCase(ticketRepo, participantRepo, logger);
const listUseCase = new ListUserTicketsUseCase(ticketRepo);

const TYPES: ReadonlyArray<{ name: string; value: string }> = [
  { name: 'Comprar', value: 'BUY' },
  { name: 'Vender', value: 'SELL' },
  { name: 'Robux', value: 'ROBUX' },
  { name: 'Nitro', value: 'NITRO' },
  { name: 'Decor/Builds', value: 'DECOR' },
];

const ensureGuildInteraction = (interaction: ChatInputCommandInteraction) => {
  if (!interaction.guild || interaction.channel?.type !== ChannelType.GuildText) {
    throw new UnauthorizedActionError('tickets:command:guild-only');
  }

  return interaction.guild;
};

const buildOpenDto = (interaction: ChatInputCommandInteraction): CreateGeneralTicketDTO => {
  const type = interaction.options.getString('type', true).toUpperCase();
  const summary = interaction.options.getString('summary', true).trim();
  const notes = interaction.options.getString('notes', true).trim();
  const partner = interaction.options.getUser('partner');
  const reference = interaction.options.getString('reference') ?? undefined;

  switch (type) {
    case 'BUY':
      return {
        type: 'BUY',
        userId: interaction.user.id,
        guildId: interaction.guildId!,
        partnerId: partner?.id,
        referenceMessageUrl: reference,
        context: {
          item: summary,
          notes,
          quantity: interaction.options.getInteger('quantity') ?? undefined,
          budgetRobux: interaction.options.getInteger('budget') ?? undefined,
        },
      } satisfies CreateGeneralTicketDTO;
    case 'SELL':
      return {
        type: 'SELL',
        userId: interaction.user.id,
        guildId: interaction.guildId!,
        partnerId: partner?.id,
        referenceMessageUrl: reference,
        context: {
          item: summary,
          notes,
          quantity: interaction.options.getInteger('quantity') ?? undefined,
          priceRobux: interaction.options.getInteger('price') ?? undefined,
          acceptsMiddleman: interaction.options.getBoolean('accepts_middleman') ?? true,
        },
      } satisfies CreateGeneralTicketDTO;
    case 'ROBUX': {
      const amount = interaction.options.getInteger('amount', true);
      const paymentMethod = interaction.options.getString('payment_method', true).trim();
      return {
        type: 'ROBUX',
        userId: interaction.user.id,
        guildId: interaction.guildId!,
        partnerId: partner?.id,
        referenceMessageUrl: reference,
        context: {
          amount,
          paymentMethod,
          notes,
        },
      } satisfies CreateGeneralTicketDTO;
    }
    case 'NITRO': {
      const plan = interaction.options.getString('plan')?.toUpperCase() ?? 'BOOST';
      return {
        type: 'NITRO',
        userId: interaction.user.id,
        guildId: interaction.guildId!,
        partnerId: partner?.id,
        referenceMessageUrl: reference,
        context: {
          plan: plan === 'CLASSIC' || plan === 'GIFT' ? (plan as 'CLASSIC' | 'GIFT' | 'BOOST') : 'BOOST',
          months: interaction.options.getInteger('months') ?? undefined,
          notes,
        },
      } satisfies CreateGeneralTicketDTO;
    }
    case 'DECOR':
      return {
        type: 'DECOR',
        userId: interaction.user.id,
        guildId: interaction.guildId!,
        partnerId: partner?.id,
        referenceMessageUrl: reference,
        context: {
          asset: summary,
          theme: interaction.options.getString('theme')?.trim(),
          notes,
        },
      } satisfies CreateGeneralTicketDTO;
    default:
      throw new UnauthorizedActionError('tickets:open:unsupported-type');
  }
};

const handleOpen = async (interaction: ChatInputCommandInteraction): Promise<void> => {
  const guild = ensureGuildInteraction(interaction);
  await interaction.deferReply({ ephemeral: true });

  const dto = buildOpenDto(interaction);
  const { ticket, channel } = await openUseCase.execute(dto, guild);

  await interaction.editReply({
    embeds: [
      embedFactory.success({
        title: 'Ticket creado',
        description: `Se creó el ticket **#${ticket.id}** en ${channel}. El personal revisará tu solicitud pronto.`,
      }),
    ],
    components: [TicketShortcutSelect.build()],
  });
};

const handleClose = async (interaction: ChatInputCommandInteraction): Promise<void> => {
  ensureGuildInteraction(interaction);
  const ticketId = interaction.options.getInteger('ticket_id', true);
  const reason = interaction.options.getString('reason') ?? undefined;
  const allowOverride = interaction.options.getBoolean('staff_override') ?? false;

  if (allowOverride) {
    const permissions = interaction.memberPermissions;
    if (
      !permissions?.has(PermissionFlagsBits.ManageGuild) &&
      !permissions?.has(PermissionFlagsBits.ModerateMembers)
    ) {
      throw new UnauthorizedActionError('tickets:close:override-permission');
    }
  }

  await interaction.deferReply({ ephemeral: true });

  const dto: CloseGeneralTicketDTO = {
    ticketId,
    executorId: interaction.user.id,
    reason,
    allowStaffOverride: allowOverride,
  };

  await closeUseCase.execute(dto);

  await interaction.editReply({
    embeds: [
      embedFactory.success({
        title: 'Ticket cerrado',
        description: `El ticket **#${ticketId}** se cerró correctamente.`,
      }),
    ],
  });
};

const handleList = async (interaction: ChatInputCommandInteraction): Promise<void> => {
  ensureGuildInteraction(interaction);
  await interaction.deferReply({ ephemeral: true });

  const dto: ListUserTicketsDTO = {
    userId: interaction.options.getUser('user')?.id ?? interaction.user.id,
    guildId: interaction.guildId!,
    includeClosed: interaction.options.getBoolean('include_closed') ?? false,
    limit: interaction.options.getInteger('limit') ?? undefined,
  };

  const tickets = await listUseCase.execute(dto);

  if (tickets.length === 0) {
    await interaction.editReply({
      embeds: [
        embedFactory.info({
          title: 'Sin tickets encontrados',
          description:
            dto.userId === interaction.user.id
              ? 'No tienes tickets abiertos en este momento.'
              : 'El usuario seleccionado no tiene tickets en el historial reciente.',
        }),
      ],
      components: [TicketShortcutSelect.build()],
    });
    return;
  }

  const fields = tickets.map((ticket) => ({
    name: `#${ticket.id} · ${ticket.type}`,
    value:
      `Canal: <#${ticket.channelId.toString()}>\nEstado: ${ticket.status}\nCreado: <t:${Math.floor(
        ticket.createdAt.getTime() / 1_000,
      )}:R>`,
  }));

  await interaction.editReply({
    embeds: [
      embedFactory.info({
        title: 'Tickets del usuario',
        description: 'Listado de tickets generales asociados al usuario indicado.',
        fields,
      }),
    ],
    components: [TicketShortcutSelect.build()],
  });
};

export const ticketCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Gestiona los tickets generales del servidor')
    .addSubcommand((sub) =>
      sub
        .setName('open')
        .setDescription('Abrir un nuevo ticket general')
        .addStringOption((option) =>
          option
            .setName('type')
            .setDescription('Tipo de ticket a crear')
            .setRequired(true)
            .addChoices(...TYPES),
        )
        .addStringOption((option) =>
          option
            .setName('summary')
            .setDescription('Artículo, servicio o asset principal')
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName('notes')
            .setDescription('Contexto detallado de tu solicitud (mínimo 20 caracteres)')
            .setRequired(true),
        )
        .addIntegerOption((option) =>
          option
            .setName('quantity')
            .setDescription('Cantidad estimada (para compra/venta)')
            .setMinValue(1),
        )
        .addIntegerOption((option) =>
          option
            .setName('budget')
            .setDescription('Presupuesto máximo en Robux (tickets de compra)')
            .setMinValue(1),
        )
        .addIntegerOption((option) =>
          option
            .setName('price')
            .setDescription('Precio solicitado en Robux (tickets de venta)')
            .setMinValue(1),
        )
        .addBooleanOption((option) =>
          option
            .setName('accepts_middleman')
            .setDescription('Indica si aceptas middleman en el ticket de venta'),
        )
        .addIntegerOption((option) =>
          option
            .setName('amount')
            .setDescription('Cantidad de Robux (tickets de Robux)')
            .setMinValue(1),
        )
        .addStringOption((option) =>
          option
            .setName('payment_method')
            .setDescription('Método de pago para el ticket de Robux'),
        )
        .addStringOption((option) =>
          option
            .setName('plan')
            .setDescription('Plan de Nitro (tickets de Nitro)')
            .addChoices(
              { name: 'Boost', value: 'BOOST' },
              { name: 'Classic', value: 'CLASSIC' },
              { name: 'Regalo', value: 'GIFT' },
            ),
        )
        .addIntegerOption((option) =>
          option
            .setName('months')
            .setDescription('Duración en meses para el ticket de Nitro')
            .setMinValue(1),
        )
        .addStringOption((option) =>
          option
            .setName('theme')
            .setDescription('Tema o estilo solicitado (tickets de decor)'),
        )
        .addUserOption((option) =>
          option
            .setName('partner')
            .setDescription('Usuario contraparte involucrado (opcional)'),
        )
        .addStringOption((option) =>
          option
            .setName('reference')
            .setDescription('URL del mensaje de referencia con más detalles'),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('close')
        .setDescription('Cerrar un ticket general existente')
        .addIntegerOption((option) =>
          option
            .setName('ticket_id')
            .setDescription('Identificador numérico del ticket')
            .setRequired(true),
        )
        .addBooleanOption((option) =>
          option
            .setName('staff_override')
            .setDescription('Permite cerrar incluso si no participaste en el ticket'),
        )
        .addStringOption((option) =>
          option.setName('reason').setDescription('Motivo del cierre (opcional)'),
    )
    .addSubcommand((sub) =>
      sub
        .setName('list')
        .setDescription('Listar tickets generales de un usuario')
        .addUserOption((option) =>
          option
            .setName('user')
            .setDescription('Usuario a consultar (por defecto tú)'),
        )
        .addBooleanOption((option) =>
          option
            .setName('include_closed')
            .setDescription('Incluir tickets cerrados en el resultado'),
        )
        .addIntegerOption((option) =>
          option
            .setName('limit')
            .setDescription('Número máximo de tickets a mostrar (1-25)')
            .setMinValue(1)
            .setMaxValue(25),
        ),
    ),
  category: 'Tickets',
  examples: [
    '/ticket open type:buy summary:"Limited" notes:"Busco limiteds a buen precio"',
    '/ticket close ticket_id:42',
    '/ticket list include_closed:true',
  ],
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'open':
        await handleOpen(interaction);
        break;
      case 'close':
        await handleClose(interaction);
        break;
      case 'list':
        await handleList(interaction);
        break;
      default:
        await interaction.reply({
          embeds: [
            embedFactory.warning({
              title: 'Subcomando no disponible',
              description: 'La acción solicitada no está implementada.',
            }),
          ],
          ephemeral: true,
        });
    }
  },
};
