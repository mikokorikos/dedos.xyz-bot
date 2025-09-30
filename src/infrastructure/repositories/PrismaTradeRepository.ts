// ============================================================================
// RUTA: src/infrastructure/repositories/PrismaTradeRepository.ts
// ============================================================================

import { Prisma, type PrismaClient } from '@prisma/client';

import { Trade } from '@/domain/entities/Trade';
import type { TradeItem } from '@/domain/entities/types';
import type { CreateTradeData, ITradeRepository } from '@/domain/repositories/ITradeRepository';
import type { TransactionContext } from '@/domain/repositories/transaction';
import { TradeStatus } from '@/domain/value-objects/TradeStatus';

type PrismaClientLike = PrismaClient | Prisma.TransactionClient;

type PrismaTradeWithItems = Prisma.MiddlemanTradeGetPayload<{
  include: { items: true };
}>;

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
      include: { items: true },
    });

    return this.toDomain(trade);
  }

  public async findById(id: number): Promise<Trade | null> {
    const trade = await this.prisma.middlemanTrade.findUnique({
      where: { id },
      include: { items: true },
    });

    return trade ? this.toDomain(trade) : null;
  }

  public async findByTicketId(ticketId: number): Promise<readonly Trade[]> {
    const trades = await this.prisma.middlemanTrade.findMany({
      where: { ticketId },
      include: { items: true },
    });

    return trades.map((trade) => this.toDomain(trade));
  }

  public async findByUserId(userId: bigint): Promise<readonly Trade[]> {
    const trades = await this.prisma.middlemanTrade.findMany({
      where: { userId },
      include: { items: true },
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
      trade.createdAt,
    );
  }

  private static isTransactionClient(value: TransactionContext): value is Prisma.TransactionClient {
    return typeof value === 'object' && value !== null && 'middlemanTrade' in value;
  }
}
