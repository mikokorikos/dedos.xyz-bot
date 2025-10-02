// =============================================================================
// RUTA: src/application/usecases/tickets/CloseGeneralTicketUseCase.ts
// =============================================================================

import type { TextChannel } from 'discord.js';
import type { Logger } from 'pino';

import type { ITicketRepository } from '@/domain/repositories/ITicketRepository';
import type { ITicketParticipantRepository } from '@/domain/repositories/ITicketParticipantRepository';
import { embedFactory, type EmbedFactory } from '@/presentation/embeds/EmbedFactory';
import {
  TicketClosedError,
  TicketNotFoundError,
  UnauthorizedActionError,
} from '@/shared/errors/domain.errors';
import type { PrismaClient } from '@prisma/client';

export class CloseGeneralTicketUseCase {
  public constructor(
    private readonly ticketRepo: ITicketRepository,
    private readonly participantRepo: ITicketParticipantRepository,
    private readonly prisma: PrismaClient,
    private readonly logger: Logger,
    private readonly embeds: EmbedFactory = embedFactory,
  ) {}

  public async execute(ticketId: number, actorId: string | bigint, channel: TextChannel): Promise<void> {
    const requesterId = typeof actorId === 'bigint' ? actorId : BigInt(actorId);

    const ticket = await this.ticketRepo.findById(ticketId);
    if (!ticket) {
      throw new TicketNotFoundError(String(ticketId));
    }

    if (ticket.isClosed()) {
      throw new TicketClosedError(ticketId);
    }

    const isOwner = ticket.isOwnedBy(requesterId);
    const isParticipant = await this.participantRepo.isParticipant(ticketId, requesterId);

    if (!isOwner && !isParticipant) {
      throw new UnauthorizedActionError('ticket:close');
    }

    ticket.close();

    await this.prisma.$transaction(async (tx) => {
      await this.ticketRepo.withTransaction(tx).update(ticket);
    });

    const embed = this.embeds.success({
      title: `Ticket #${ticket.id} cerrado`,
      description: 'Se marcó el ticket como cerrado. Gracias por usar el sistema de tickets.',
    });

    await channel.send({ embeds: [embed] });

    this.logger.info({ ticketId, actorId: requesterId.toString(), channelId: channel.id }, 'General ticket closed.');
  }
}
