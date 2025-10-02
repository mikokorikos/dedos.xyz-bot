// ============================================================================
// RUTA: src/infrastructure/repositories/PrismaTradeRepository.ts
// ============================================================================

import { Prisma, type PrismaClient } from '@prisma/client';

import { Trade, type TradeParticipantFinalization } from '@/domain/entities/Trade';
import type { TradeItem } from '@/domain/entities/types';
import type { CreateTradeData, ITradeRepository } from '@/domain/repositories/ITradeRepository';
import type { TransactionContext } from '@/domain/repositories/transaction';
import { TradeStatus } from '@/domain/value-objects/TradeStatus';

type PrismaClientLike = PrismaClient | Prisma.TransactionClient;

type PrismaTradeWithItems = Prisma.MiddlemanTradeGetPayload<{
  include: { items: true; ticket: { select: { finalizations: true } } };
}>;

const mapFinalizationFromPrisma = (
  finalization: Prisma.MiddlemanTradeFinalizationGetPayload<Record<string, never>>,
): TradeParticipantFinalization => ({
  userId: finalization.userId,
  confirmedAt: finalization.confirmedAt,
});

const mapItemToPrisma = (item: TradeItem) => ({
  itemName: item.name,
  quantity: item.quantity,
  metadata:
    item.metadata === undefined || item.metadata === null
      ? Prisma.JsonNull
      : (item.metadata as Prisma.InputJsonValue),
});

const mapItemFromPrisma = (item: Prisma.MiddlemanTradeItemGetPayload<Record<string, never>>) => ({
  id: item.id,
  name: item.itemName,
  quantity: item.quantity,
  metadata:
    typeof item.metadata === 'object' && item.metadata !== null
      ? (item.metadata as Record<string, unknown>)
      : null,
});

export class PrismaTradeRepository implements ITradeRepository {
  public constructor(private readonly prisma: PrismaClientLike) {}

  public withTransaction(context: TransactionContext): ITradeRepository {
    if (!PrismaTradeRepository.isTransactionClient(context)) {
      throw new Error('Invalid Prisma transaction context provided to trade repository.');
    }

    return new PrismaTradeRepository(context);
  }

  public async create(data: CreateTradeData): Promise<Trade> {
    const trade = await this.prisma.middlemanTrade.create({
      data: {
        ticketId: data.ticketId,
        userId: data.userId,
        robloxUsername: data.robloxUsername,
        robloxUserId: data.robloxUserId ?? null,
        status: data.status ?? TradeStatus.PENDING,
        confirmed: data.confirmed ?? false,
        items: data.items
          ? {
              create: data.items.map(mapItemToPrisma),
            }
          : undefined,
      },
      include: { items: true, ticket: { select: { finalizations: true } } },
    });

    return this.toDomain(trade);
  }

  public async findById(id: number): Promise<Trade | null> {
    const trade = await this.prisma.middlemanTrade.findUnique({
      where: { id },
      include: { items: true, ticket: { select: { finalizations: true } } },
    });

    return trade ? this.toDomain(trade) : null;
  }

  public async findByTicketId(ticketId: number): Promise<readonly Trade[]> {
    const trades = await this.prisma.middlemanTrade.findMany({
      where: { ticketId },
      include: { items: true, ticket: { select: { finalizations: true } } },
    });

    return trades.map((trade) => this.toDomain(trade));
  }

  public async findByUserId(userId: bigint): Promise<readonly Trade[]> {
    const trades = await this.prisma.middlemanTrade.findMany({
      where: { userId },
      include: { items: true, ticket: { select: { finalizations: true } } },
    });

    return trades.map((trade) => this.toDomain(trade));
  }

  public async update(trade: Trade): Promise<void> {
    await this.prisma.middlemanTrade.update({
      where: { id: trade.id },
      data: {
        status: trade.status,
        confirmed: trade.confirmed,
        robloxUserId: trade.robloxUserId,
      },
    });
  }

  public async confirmParticipant(
    tradeId: number,
    userId: bigint,
    confirmedAt: Date = new Date(),
  ): Promise<void> {
    const trade = await this.prisma.middlemanTrade.findUnique({
      where: { id: tradeId },
      select: { ticketId: true },
    });

    if (!trade) {
      throw new Error(`Trade with id ${tradeId} not found.`);
    }

    await this.prisma.middlemanTradeFinalization.upsert({
      where: { ticketId_userId: { ticketId: trade.ticketId, userId } },
      create: { ticketId: trade.ticketId, userId, confirmedAt },
      update: { confirmedAt },
    });
  }

  public async cancelParticipant(tradeId: number, userId: bigint): Promise<void> {
    const trade = await this.prisma.middlemanTrade.findUnique({
      where: { id: tradeId },
      select: { ticketId: true },
    });

    if (!trade) {
      throw new Error(`Trade with id ${tradeId} not found.`);
    }

    await this.prisma.middlemanTradeFinalization.deleteMany({
      where: { ticketId: trade.ticketId, userId },
    });
  }

  public async replaceItems(tradeId: number, items: ReadonlyArray<TradeItem>): Promise<void> {
    await this.prisma.middlemanTradeItem.deleteMany({ where: { tradeId } });

    if (items.length === 0) {
      return;
    }

    await this.prisma.middlemanTradeItem.createMany({
      data: items.map((item) => ({
        tradeId,
        ...mapItemToPrisma(item),
      })),
    });
  }

  public async listParticipantFinalizations(
    ticketId: number,
  ): Promise<readonly TradeParticipantFinalization[]> {
    const finalizations = await this.prisma.middlemanTradeFinalization.findMany({
      where: { ticketId },
    });

    return finalizations.map(mapFinalizationFromPrisma);
  }

  public async delete(id: number): Promise<void> {
    await this.prisma.middlemanTrade.delete({ where: { id } });
  }

  private toDomain(trade: PrismaTradeWithItems): Trade {
    return new Trade(
      trade.id,
      trade.ticketId,
      trade.userId,
      trade.robloxUsername,
      trade.robloxUserId,
      trade.status as TradeStatus,
      trade.confirmed,
      trade.items.map(mapItemFromPrisma),
      trade.ticket.finalizations.map(mapFinalizationFromPrisma),
      trade.createdAt,
    );
  }

  private static isTransactionClient(value: TransactionContext): value is Prisma.TransactionClient {
    return typeof value === 'object' && value !== null && 'middlemanTrade' in value;
  }
}
