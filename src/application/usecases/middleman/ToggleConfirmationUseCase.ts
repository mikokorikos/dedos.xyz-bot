// =============================================================================
// RUTA: src/application/usecases/middleman/ToggleConfirmationUseCase.ts
// =============================================================================

import type { Logger } from 'pino';

import type { IMiddlemanRepository } from '@/domain/repositories/IMiddlemanRepository';
import type { ITicketRepository } from '@/domain/repositories/ITicketRepository';
import type { ITradeRepository } from '@/domain/repositories/ITradeRepository';
import {
  TicketNotFoundError,
  TradeNotFoundError,
  UnauthorizedActionError,
} from '@/shared/errors/domain.errors';

export interface ToggleConfirmationResult {
  readonly confirmed: boolean;
  readonly finalizations: ReadonlyArray<{ userId: string; confirmedAt: Date }>;
}

export class ToggleConfirmationUseCase {
  public constructor(
    private readonly ticketRepo: ITicketRepository,
    private readonly tradeRepo: ITradeRepository,
    private readonly middlemanRepo: IMiddlemanRepository,
    private readonly logger: Logger,
  ) {}

  public async execute(tradeId: number, userId: bigint): Promise<ToggleConfirmationResult> {
    const trade = await this.tradeRepo.findById(tradeId);

    if (!trade) {
      throw new TradeNotFoundError(String(tradeId));
    }

    const ticket = await this.ticketRepo.findById(trade.ticketId);

    if (!ticket) {
      throw new TicketNotFoundError(String(trade.ticketId));
    }

    const claim = await this.middlemanRepo.getClaimByTicket(trade.ticketId);

    const isParticipant = await this.ticketRepo.isParticipant(trade.ticketId, userId);
    const isOwner = ticket.isOwnedBy(userId);
    const isMiddleman = claim?.middlemanId === userId;

    if (!isParticipant && !isOwner && !isMiddleman) {
      throw new UnauthorizedActionError('middleman:confirmation:toggle');
    }

    const alreadyConfirmed = trade.isParticipantConfirmed(userId);

    if (alreadyConfirmed) {
      trade.cancelParticipant(userId);
      await this.tradeRepo.cancelParticipant(trade.id, userId);

      const finalizations = await this.tradeRepo.listParticipantFinalizations(trade.ticketId);
      this.logger.info(
        { tradeId, ticketId: trade.ticketId, userId: userId.toString() },
        'Participante retiró su confirmación en el panel de middleman.',
      );

      return {
        confirmed: false,
        finalizations: finalizations.map((finalization) => ({
          userId: finalization.userId.toString(),
          confirmedAt: finalization.confirmedAt,
        })),
      };
    }

    trade.confirmParticipant(userId);
    await this.tradeRepo.confirmParticipant(trade.id, userId);

    const finalizations = await this.tradeRepo.listParticipantFinalizations(trade.ticketId);

    this.logger.info(
      { tradeId, ticketId: trade.ticketId, userId: userId.toString() },
      'Participante confirmó su transacción en el panel de middleman.',
    );

    return {
      confirmed: true,
      finalizations: finalizations.map((finalization) => ({
        userId: finalization.userId.toString(),
        confirmedAt: finalization.confirmedAt,
      })),
    };
  }
}
