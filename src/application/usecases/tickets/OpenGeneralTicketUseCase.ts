// =============================================================================
// RUTA: src/application/usecases/tickets/OpenGeneralTicketUseCase.ts
// =============================================================================

import type { PrismaClient } from '@prisma/client';
import type { Guild, TextChannel } from 'discord.js';
import { ChannelType, PermissionFlagsBits } from 'discord.js';
import type { Logger } from 'pino';

import {
  type CreateGeneralTicketDTO,
  CreateGeneralTicketSchema,
} from '@/application/dto/ticket.dto';
import { TicketType } from '@/domain/entities/types';
import type { ITicketParticipantRepository } from '@/domain/repositories/ITicketParticipantRepository';
import type {
  ITicketRepository,
  TicketParticipantInput,
} from '@/domain/repositories/ITicketRepository';
import type { ITicketTypePolicyRepository } from '@/domain/repositories/ITicketTypePolicyRepository';
import type { EmbedFactory } from '@/presentation/embeds/EmbedFactory';
import { embedFactory } from '@/presentation/embeds/EmbedFactory';
import {
  ChannelCleanupError,
  ChannelCreationError,
  TicketCooldownActiveError,
  TicketPolicyNotFoundError,
  TooManyOpenTicketsError,
} from '@/shared/errors/domain.errors';
import { sanitizeChannelName } from '@/shared/utils/discord.utils';

const formatContext = (payload: CreateGeneralTicketDTO): string => {
  const lines: string[] = [];

  switch (payload.type) {
    case 'BUY':
      lines.push(`**Artículo:** ${payload.context.item}`);
      if (payload.context.quantity) {
        lines.push(`**Cantidad:** ${payload.context.quantity}`);
      }
      if (payload.context.budgetRobux) {
        lines.push(`**Presupuesto:** ${payload.context.budgetRobux.toLocaleString()} Robux`);
      }
      break;
    case 'SELL':
      lines.push(`**Artículo:** ${payload.context.item}`);
      if (payload.context.quantity) {
        lines.push(`**Cantidad:** ${payload.context.quantity}`);
      }
      if (payload.context.priceRobux) {
        lines.push(`**Precio:** ${payload.context.priceRobux.toLocaleString()} Robux`);
      }
      lines.push(`**Acepta middleman:** ${payload.context.acceptsMiddleman ? 'Sí' : 'No'}`);
      break;
    case 'ROBUX':
      lines.push(`**Cantidad:** ${payload.context.amount.toLocaleString()} Robux`);
      lines.push(`**Pago:** ${payload.context.paymentMethod}`);
      break;
    case 'NITRO':
      lines.push(`**Plan:** ${payload.context.plan}`);
      if (payload.context.months) {
        lines.push(`**Duración:** ${payload.context.months} meses`);
      }
      break;
    case 'DECOR':
      lines.push(`**Asset:** ${payload.context.asset}`);
      if (payload.context.theme) {
        lines.push(`**Tema:** ${payload.context.theme}`);
      }
      break;
    default:
      break;
  }

  const notes = payload.context.notes ?? '';
  if (notes) {
    lines.push('', notes);
  }

  if (payload.referenceMessageUrl) {
    lines.push('', `[Mensaje de referencia](${payload.referenceMessageUrl})`);
  }

  return lines.join('\n');
};

export class OpenGeneralTicketUseCase {
  public constructor(
    private readonly prisma: PrismaClient,
    private readonly ticketRepo: ITicketRepository,
    private readonly participantRepo: ITicketParticipantRepository,
    private readonly policyRepo: ITicketTypePolicyRepository,
    private readonly logger: Logger,
    private readonly embeds: EmbedFactory = embedFactory,
  ) {}

  public async execute(
    dto: CreateGeneralTicketDTO,
    guild: Guild,
  ): Promise<{ ticket: Awaited<ReturnType<ITicketRepository['create']>>; channel: TextChannel }> {
    const payload = CreateGeneralTicketSchema.parse(dto);
    const ownerId = BigInt(payload.userId);
    const guildId = BigInt(payload.guildId);
    const ticketType = TicketType[payload.type as keyof typeof TicketType];

    const policy = await this.policyRepo.getPolicy(ticketType);
    if (!policy) {
      throw new TicketPolicyNotFoundError(payload.type);
    }

    this.logger.debug({ ownerId: payload.userId, type: payload.type }, 'Verificando límite de tickets.');
    const openTickets = await this.ticketRepo.countOpenByOwnerAndType(ownerId, ticketType);
    if (openTickets >= policy.maxOpenPerUser) {
      throw new TooManyOpenTicketsError(policy.maxOpenPerUser);
    }

    const now = new Date();
    const cooldown = await this.policyRepo.getCooldown(ticketType, ownerId);
    if (cooldown) {
      const elapsedSeconds = Math.floor((now.getTime() - cooldown.lastOpenedAt.getTime()) / 1_000);
      const remainingSeconds = policy.cooldownSeconds - elapsedSeconds;
      if (remainingSeconds > 0) {
        throw new TicketCooldownActiveError(payload.type, remainingSeconds);
      }
    }

    const botId = guild.members.me?.id;
    if (!botId) {
      throw new ChannelCreationError('El bot no está presente en el gremio.');
    }

    const channelName = sanitizeChannelName(`${payload.type.toLowerCase()}-${payload.userId}`);
    const topic = payload.context.notes?.slice(0, 100) ?? `${payload.type} ticket`; // short topic

    this.logger.debug({ channelName, guildId: payload.guildId }, 'Creando canal de ticket general.');

    let createdChannel: TextChannel;
    try {
      createdChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        topic,
        permissionOverwrites: [
          { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
          {
            id: payload.userId,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
            ],
          },
          {
            id: botId,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ManageChannels,
              PermissionFlagsBits.ReadMessageHistory,
            ],
          },
        ],
      });

      if (policy.staffRoleId) {
        await createdChannel.permissionOverwrites.edit(String(policy.staffRoleId), {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true,
        });
      }

      if (payload.partnerId) {
        await createdChannel.permissionOverwrites.edit(payload.partnerId, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true,
        });
      }
    } catch (error) {
      this.logger.error({ err: error, channelName }, 'Falló la creación del canal de ticket general.');
      throw new ChannelCreationError((error as Error).message);
    }

    try {
      const ticket = await this.prisma.$transaction(async (tx) => {
        const transactionalTicketRepo = this.ticketRepo.withTransaction(tx);
        const transactionalParticipantRepo = this.participantRepo.withTransaction(tx);
        const transactionalPolicyRepo = this.policyRepo.withTransaction(tx);

        const createdTicket = await transactionalTicketRepo.create({
          guildId,
          channelId: BigInt(createdChannel.id),
          ownerId,
          type: ticketType,
        });

        const participants: TicketParticipantInput[] = [{ userId: ownerId, role: 'OWNER' }];
        if (payload.partnerId) {
          participants.push({ userId: BigInt(payload.partnerId), role: 'PARTNER' });
        }

        await transactionalParticipantRepo.addMany(createdTicket.id, participants);
        await transactionalPolicyRepo.upsertCooldown(ticketType, ownerId, now);

        return createdTicket;
      });

      const contextSummary = formatContext(payload);
      const mentionParts = [`<@${payload.userId}>`];
      if (payload.partnerId) {
        mentionParts.push(`<@${payload.partnerId}>`);
      }

      await createdChannel.send({
        content: mentionParts.join(' '),
        embeds: [
          this.embeds.ticketCreated({
            ticketId: ticket.id,
            type: `General · ${payload.type}`,
            ownerTag: `<@${payload.userId}>`,
            description: contextSummary,
          }),
        ],
      });

      this.logger.info(
        { ticketId: ticket.id, channelId: createdChannel.id, ownerId: payload.userId, type: payload.type },
        'Ticket general creado exitosamente.',
      );

      return { ticket, channel: createdChannel };
    } catch (error) {
      this.logger.error({ err: error, ownerId: payload.userId }, 'Fallo al persistir ticket general.');

      try {
        await createdChannel.delete('Error al registrar el ticket general.');
      } catch (cleanupError) {
        this.logger.error(
          { err: cleanupError, channelId: createdChannel.id },
          'Fallo al limpiar canal de ticket general tras error.',
        );
        throw new ChannelCleanupError(createdChannel.id, cleanupError);
      }

      throw error;
    }
  }
}
