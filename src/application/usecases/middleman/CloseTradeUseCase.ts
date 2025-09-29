// ============================================================================
// RUTA: src/application/usecases/middleman/CloseTradeUseCase.ts
// ============================================================================

import type { Prisma, PrismaClient } from '@prisma/client';
import type { TextChannel } from 'discord.js';
import type { Logger } from 'pino';

import type { IMemberStatsRepository } from '@/domain/repositories/IMemberStatsRepository';
import type { IMiddlemanRepository } from '@/domain/repositories/IMiddlemanRepository';
import type { ITicketRepository } from '@/domain/repositories/ITicketRepository';
import type { ITradeRepository } from '@/domain/repositories/ITradeRepository';
import { TradeStatus } from '@/domain/value-objects/TradeStatus';
import type { EmbedFactory } from '@/presentation/embeds/EmbedFactory';
import { embedFactory } from '@/presentation/embeds/EmbedFactory';
import {
  TicketClosedError,
  TicketNotFoundError,
  TradesNotConfirmedError,
  UnauthorizedActionError,
} from '@/shared/errors/domain.errors';

export class CloseTradeUseCase {
  public constructor(
    private readonly ticketRepo: ITicketRepository,
    private readonly tradeRepo: ITradeRepository,
    private readonly statsRepo: IMemberStatsRepository,
    private readonly middlemanRepo: IMiddlemanRepository,
    private readonly prisma: PrismaClient,
    private readonly logger: Logger,
    private readonly embeds: EmbedFactory = embedFactory,
  ) {}

  public async execute(
    ticketId: number,
    middlemanId: bigint,
    channel: TextChannel,
  ): Promise<void> {
    const ticket = await this.ticketRepo.findById(ticketId);

    if (!ticket) {
      throw new TicketNotFoundError(String(ticketId));
    }

    if (ticket.isClosed()) {
      throw new TicketClosedError(ticketId);
    }

    const claim = await this.middlemanRepo.getClaimByTicket(ticketId);
    if (!claim || claim.middlemanId !== middlemanId) {
      throw new UnauthorizedActionError('middleman:close');
    }

    const trades = await this.tradeRepo.findByTicketId(ticketId);
    if (trades.some((trade) => !trade.confirmed)) {
      throw new TradesNotConfirmedError(ticketId);
    }

    const completedAt = new Date();

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const transactionalTicketRepo = this.ticketRepo.withTransaction(tx);
      const transactionalTradeRepo = this.tradeRepo.withTransaction(tx);
      const transactionalStatsRepo = this.statsRepo.withTransaction(tx);
      const transactionalMiddlemanRepo = this.middlemanRepo.withTransaction(tx);

      for (const trade of trades) {
        if (trade.status === TradeStatus.PENDING) {
          trade.confirm();
        }

        if (!trade.canBeCompleted()) {
          throw new TradesNotConfirmedError(ticketId);
        }

        trade.complete();
        await transactionalTradeRepo.update(trade);
      }

      ticket.close();
      await transactionalTicketRepo.update(ticket);
      await transactionalMiddlemanRepo.markClosed(ticketId, { closedAt: completedAt });
      await transactionalStatsRepo.recordCompletedTrade(middlemanId, completedAt);
    });

    await this.middlemanRepo.markReviewRequested(ticketId, completedAt);

    await channel.send({
      embeds: [
        this.embeds.success({
          title: 'Ticket cerrado',
          description:
            'La transacción fue marcada como completada. Gracias por utilizar el sistema de middleman de Dedos.',
        }),
        this.embeds.reviewRequest({
          middlemanTag: `<@${middlemanId}>`,
          tradeSummary: 'Por favor comparte tu experiencia respondiendo al formulario de reseña.',
        }),
      ],
    });

    this.logger.info(
      { ticketId, middlemanId: middlemanId.toString(), channelId: channel.id },
      'Ticket de middleman cerrado correctamente.',
    );
  }
}
