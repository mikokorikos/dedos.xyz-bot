// =============================================================================
// RUTA: src/application/usecases/middleman/SendFinalizationUseCase.ts
// =============================================================================

import type { TextChannel } from 'discord.js';
import type { Logger } from 'pino';

import type { IMiddlemanRepository } from '@/domain/repositories/IMiddlemanRepository';
import type { ITicketRepository } from '@/domain/repositories/ITicketRepository';
import type { ITradeRepository } from '@/domain/repositories/ITradeRepository';
import type { EmbedFactory } from '@/presentation/embeds/EmbedFactory';
import { embedFactory } from '@/presentation/embeds/EmbedFactory';
import {
  TicketNotFoundError,
  TradeNotFoundError,
  UnauthorizedActionError,
} from '@/shared/errors/domain.errors';

export class SendFinalizationUseCase {
  public constructor(
    private readonly ticketRepo: ITicketRepository,
    private readonly tradeRepo: ITradeRepository,
    private readonly middlemanRepo: IMiddlemanRepository,
    private readonly logger: Logger,
    private readonly embeds: EmbedFactory = embedFactory,
  ) {}

  public async execute(ticketId: number, actorId: bigint, channel: TextChannel): Promise<void> {
    const ticket = await this.ticketRepo.findById(ticketId);

    if (!ticket) {
      throw new TicketNotFoundError(String(ticketId));
    }

    const claim = await this.middlemanRepo.getClaimByTicket(ticketId);

    const isParticipant = await this.ticketRepo.isParticipant(ticketId, actorId);
    const isOwner = ticket.isOwnedBy(actorId);
    const isMiddleman = claim?.middlemanId === actorId;

    if (!isParticipant && !isOwner && !isMiddleman) {
      throw new UnauthorizedActionError('middleman:finalization:send');
    }

    const trades = await this.tradeRepo.findByTicketId(ticketId);

    if (trades.length === 0) {
      throw new TradeNotFoundError('none');
    }

    const finalizations = await this.tradeRepo.listParticipantFinalizations(ticketId);

    const description =
      finalizations.length === 0
        ? 'Aún no hay confirmaciones registradas por los participantes.'
        : finalizations
            .map((finalization) => {
              const timestamp = finalization.confirmedAt.toLocaleString('es-ES');
              return `• <@${finalization.userId.toString()}> — ${timestamp}`;
            })
            .join('\n');

    await channel.send({
      embeds: [
        this.embeds.info({
          title: `Resumen de finalización • Ticket #${ticket.id}`,
          description,
        }),
      ],
    });

    this.logger.info(
      {
        ticketId,
        actorId: actorId.toString(),
        channelId: channel.id,
        finalizations: finalizations.length,
      },
      'Panel de finalización enviado al canal del ticket.',
    );
  }
}
