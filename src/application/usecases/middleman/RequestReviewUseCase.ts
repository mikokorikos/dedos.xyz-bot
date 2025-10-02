// =============================================================================
// RUTA: src/application/usecases/middleman/RequestReviewUseCase.ts
// =============================================================================

import type { TextChannel } from 'discord.js';
import type { Logger } from 'pino';

import type { IMiddlemanRepository } from '@/domain/repositories/IMiddlemanRepository';
import type { ITicketRepository } from '@/domain/repositories/ITicketRepository';
import type { EmbedFactory } from '@/presentation/embeds/EmbedFactory';
import { embedFactory } from '@/presentation/embeds/EmbedFactory';
import {
  InvalidTicketStateError,
  TicketNotFoundError,
  UnauthorizedActionError,
} from '@/shared/errors/domain.errors';

export class RequestReviewUseCase {
  public constructor(
    private readonly ticketRepo: ITicketRepository,
    private readonly middlemanRepo: IMiddlemanRepository,
    private readonly logger: Logger,
    private readonly embeds: EmbedFactory = embedFactory,
  ) {}

  public async execute(ticketId: number, actorId: bigint, channel: TextChannel): Promise<void> {
    const ticket = await this.ticketRepo.findById(ticketId);

    if (!ticket) {
      throw new TicketNotFoundError(String(ticketId));
    }

    if (!ticket.isClosed()) {
      throw new InvalidTicketStateError(ticket.status, 'CLOSED');
    }

    const claim = await this.middlemanRepo.getClaimByTicket(ticketId);

    if (!claim || claim.middlemanId !== actorId) {
      throw new UnauthorizedActionError('middleman:review:request');
    }

    const requestedAt = new Date();
    await this.middlemanRepo.markReviewRequested(ticketId, requestedAt);

    await channel.send({
      embeds: [
        this.embeds.info({
          title: 'Solicitud de reseña enviada',
          description:
            'Se ha recordado a los participantes que compartan su experiencia. ¡Gracias por usar el sistema de middleman!',
        }),
      ],
    });

    this.logger.info(
      { ticketId, actorId: actorId.toString(), requestedAt: requestedAt.toISOString() },
      'Solicitud de reseña reenviada desde el panel de middleman.',
    );
  }
}
