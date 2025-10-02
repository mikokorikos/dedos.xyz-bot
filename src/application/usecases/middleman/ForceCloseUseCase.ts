// =============================================================================
// RUTA: src/application/usecases/middleman/ForceCloseUseCase.ts
// =============================================================================

import type { Prisma, PrismaClient } from '@prisma/client';
import type { TextChannel } from 'discord.js';
import type { Logger } from 'pino';

import type { IMiddlemanRepository } from '@/domain/repositories/IMiddlemanRepository';
import type { ITicketRepository } from '@/domain/repositories/ITicketRepository';
import type { ITradeRepository } from '@/domain/repositories/ITradeRepository';
import { TradeStatus } from '@/domain/value-objects/TradeStatus';
import type { EmbedFactory } from '@/presentation/embeds/EmbedFactory';
import { embedFactory } from '@/presentation/embeds/EmbedFactory';
import {
  TicketClosedError,
  TicketNotFoundError,
  UnauthorizedActionError,
} from '@/shared/errors/domain.errors';

export class ForceCloseUseCase {
  public constructor(
    private readonly ticketRepo: ITicketRepository,
    private readonly tradeRepo: ITradeRepository,
    private readonly middlemanRepo: IMiddlemanRepository,
    private readonly prisma: PrismaClient,
    private readonly logger: Logger,
    private readonly embeds: EmbedFactory = embedFactory,
  ) {}

  public async execute(
    ticketId: number,
    actorId: bigint,
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

    if (!claim || claim.middlemanId !== actorId) {
      throw new UnauthorizedActionError('middleman:force-close');
    }

    const trades = await this.tradeRepo.findByTicketId(ticketId);
    const closedAt = new Date();

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const transactionalTicketRepo = this.ticketRepo.withTransaction(tx);
      const transactionalTradeRepo = this.tradeRepo.withTransaction(tx);
      const transactionalMiddlemanRepo = this.middlemanRepo.withTransaction(tx);

      for (const trade of trades) {
        if (trade.getStatus() !== TradeStatus.CANCELLED && trade.getStatus() !== TradeStatus.COMPLETED) {
          trade.cancel();
        }

        await transactionalTradeRepo.update(trade);
      }

      ticket.close();
      await transactionalTicketRepo.update(ticket);
      await transactionalMiddlemanRepo.markClosed(ticketId, { closedAt, forcedClose: true });
    });

    await channel.send({
      embeds: [
        this.embeds.warning({
          title: 'Ticket cerrado forzosamente',
          description:
            'El ticket fue cerrado manualmente por el middleman asignado. Si necesitas continuar, abre un nuevo ticket.',
        }),
      ],
    });

    this.logger.warn(
      { ticketId, actorId: actorId.toString(), channelId: channel.id },
      'Ticket cerrado utilizando el flujo de cierre forzoso.',
    );
  }
}
