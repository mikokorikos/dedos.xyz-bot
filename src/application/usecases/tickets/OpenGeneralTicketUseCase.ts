// =============================================================================
// RUTA: src/application/usecases/tickets/OpenGeneralTicketUseCase.ts
// =============================================================================

import type { Guild, TextChannel } from 'discord.js';
import { ChannelType, PermissionFlagsBits } from 'discord.js';
import type { Logger } from 'pino';

import { CreateGeneralTicketSchema, type CreateGeneralTicketDTO } from '@/application/dto/ticket-general.dto';
import { TicketType } from '@/domain/entities/types';
import type { ITicketRepository } from '@/domain/repositories/ITicketRepository';
import type { ITicketParticipantRepository } from '@/domain/repositories/ITicketParticipantRepository';
import type { ITicketPolicyRepository } from '@/domain/repositories/ITicketPolicyRepository';
import { embedFactory, type EmbedFactory } from '@/presentation/embeds/EmbedFactory';
import { TicketCooldownError, TooManyOpenTicketsError } from '@/shared/errors/domain.errors';
import { sanitizeChannelName } from '@/shared/utils/discord.utils';
import type { PrismaClient } from '@prisma/client';

const GENERAL_POLICIES: Record<Exclude<TicketType, TicketType.MM>, { maxOpen: number; cooldownMinutes: number; label: string }>
  = {
    [TicketType.BUY]: { maxOpen: 3, cooldownMinutes: 30, label: 'Compra' },
    [TicketType.SELL]: { maxOpen: 3, cooldownMinutes: 30, label: 'Venta' },
    [TicketType.ROBUX]: { maxOpen: 1, cooldownMinutes: 120, label: 'Robux' },
    [TicketType.NITRO]: { maxOpen: 1, cooldownMinutes: 120, label: 'Nitro' },
    [TicketType.DECOR]: { maxOpen: 2, cooldownMinutes: 60, label: 'Decoración' },
  } as const;

const SNOWFLAKE_EXTRACTOR = /\d{17,20}/u;

const extractSnowflake = (value?: string | null): bigint | undefined => {
  if (!value) {
    return undefined;
  }

  const match = value.match(SNOWFLAKE_EXTRACTOR);
  if (!match) {
    return undefined;
  }

  try {
    return BigInt(match[0]);
  } catch {
    return undefined;
  }
};

export class OpenGeneralTicketUseCase {
  public constructor(
    private readonly ticketRepo: ITicketRepository,
    private readonly policyRepo: ITicketPolicyRepository,
    private readonly participantRepo: ITicketParticipantRepository,
    private readonly prisma: PrismaClient,
    private readonly logger: Logger,
    private readonly embeds: EmbedFactory = embedFactory,
  ) {}

  public async execute(
    dto: CreateGeneralTicketDTO,
    guild: Guild,
  ): Promise<{ ticket: Awaited<ReturnType<ITicketRepository['create']>>; channel: TextChannel }> {
    const payload = CreateGeneralTicketSchema.parse(dto);
    if (payload.type === TicketType.MM) {
      throw new Error('General ticket use case does not support middleman tickets.');
    }

    const ownerId = BigInt(payload.userId);
    const guildId = BigInt(payload.guildId);
    const policy = GENERAL_POLICIES[payload.type];

    this.logger.debug({ ownerId: payload.userId, type: payload.type }, 'Evaluating ticket policy snapshot.');
    const snapshot = await this.policyRepo.getSnapshot(ownerId, payload.type);

    if (snapshot.openCount >= policy.maxOpen) {
      this.logger.info({ ownerId: payload.userId, type: payload.type }, 'Ticket limit reached for owner.');
      throw new TooManyOpenTicketsError(policy.maxOpen);
    }

    if (snapshot.lastOpenedAt) {
      const cooldownMs = policy.cooldownMinutes * 60 * 1000;
      const elapsed = Date.now() - snapshot.lastOpenedAt.getTime();
      if (elapsed < cooldownMs) {
        const availableAt = new Date(snapshot.lastOpenedAt.getTime() + cooldownMs);
        this.logger.info({ ownerId: payload.userId, type: payload.type, availableAt }, 'Ticket opening on cooldown.');
        throw new TicketCooldownError(availableAt);
      }
    }

    const botId = guild.members.me?.id;

    if (!botId) {
      throw new Error('Bot must be present in guild to open ticket.');
    }

    const channelName = sanitizeChannelName(`${payload.type.toLowerCase()}-${payload.userId}`);
    this.logger.debug({ channelName, guildId: payload.guildId }, 'Creating general ticket channel.');

    let channel: TextChannel;

    try {
      channel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        topic: payload.context.slice(0, 1000),
        permissionOverwrites: [
          { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
          { id: payload.userId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
          { id: botId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory] },
        ],
      });
    } catch (error) {
      this.logger.error({ err: error, ownerId: payload.userId }, 'Failed to create general ticket channel.');
      throw error;
    }

    const partnerId = extractSnowflake(payload.partnerTag ?? null);

    try {
      const ticket = await this.prisma.$transaction(async (tx) => {
        const transactionalTicketRepo = this.ticketRepo.withTransaction(tx);
        const transactionalParticipantRepo = this.participantRepo.withTransaction(tx);

        const createdTicket = await transactionalTicketRepo.create({
          guildId,
          channelId: BigInt(channel.id),
          ownerId,
          type: payload.type,
        });

        await transactionalParticipantRepo.addParticipant({ ticketId: createdTicket.id, userId: ownerId, role: 'OWNER' });
        if (partnerId) {
          await transactionalParticipantRepo.addParticipant({ ticketId: createdTicket.id, userId: partnerId, role: 'PARTNER' });
        }

        return createdTicket;
      });

      const embed = this.embeds.ticketCreated({
        ticketId: ticket.id,
        type: policy.label,
        ownerTag: `<@${payload.userId}>`,
        description: payload.context,
      });

      await channel.send({
        content: [payload.userId, partnerId ? String(partnerId) : null]
          .filter(Boolean)
          .map((id) => `<@${id}>`)
          .join(' '),
        embeds: [embed],
      });

      this.logger.info(
        { ticketId: ticket.id, ownerId: payload.userId, channelId: channel.id, type: payload.type },
        'General ticket created successfully.',
      );

      return { ticket, channel };
    } catch (error) {
      this.logger.error({ err: error, ticketOwnerId: payload.userId, channelId: channel.id }, 'Failed to persist general ticket.');
      await channel.delete('Rolling back general ticket creation.');
      throw error;
    }
  }
}
