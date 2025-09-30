// ============================================================================
// RUTA: src/infrastructure/repositories/PrismaMemberStatsRepository.ts
// ============================================================================

import type { Prisma, PrismaClient } from '@prisma/client';

import { MemberTradeStats } from '@/domain/entities/MemberTradeStats';
import type {
  IMemberStatsRepository,
  TradeMetadata,
} from '@/domain/repositories/IMemberStatsRepository';
import type { TransactionContext } from '@/domain/repositories/transaction';

type PrismaClientLike = PrismaClient | Prisma.TransactionClient;

const mapToDomain = (payload: Prisma.MemberTradeStatsGetPayload<Record<string, never>>): MemberTradeStats =>
  new MemberTradeStats(
    payload.userId,
    payload.tradesCompleted,
    payload.lastTradeAt ?? null,
    payload.robloxUsername ?? null,
    payload.robloxUserId ?? null,
    payload.partnerTag ?? null,
    payload.updatedAt,
  );

export class PrismaMemberStatsRepository implements IMemberStatsRepository {
  public constructor(private readonly prisma: PrismaClientLike) {}

  public withTransaction(context: TransactionContext): IMemberStatsRepository {
    if (!PrismaMemberStatsRepository.isTransactionClient(context)) {
      throw new Error('Invalid Prisma transaction context provided to member stats repository.');
    }

    return new PrismaMemberStatsRepository(context);
  }

  public async getByUserId(userId: bigint): Promise<MemberTradeStats | null> {
    const stats = await this.prisma.memberTradeStats.findUnique({ where: { userId } });

    return stats ? mapToDomain(stats) : null;
  }

  public async recordCompletedTrade(
    userId: bigint,
    completedAt: Date,
    metadata?: TradeMetadata,
  ): Promise<MemberTradeStats> {
    const stats = await this.prisma.memberTradeStats.upsert({
      where: { userId },
      create: {
        userId,
        tradesCompleted: 1,
        lastTradeAt: completedAt,
        robloxUsername: metadata?.robloxUsername ?? null,
        robloxUserId: metadata?.robloxUserId ?? null,
        partnerTag: metadata?.partnerTag ?? null,
      },
      update: {
        tradesCompleted: { increment: 1 },
        lastTradeAt: completedAt,
        robloxUsername: metadata?.robloxUsername ?? undefined,
        robloxUserId:
          metadata?.robloxUserId !== undefined ? metadata.robloxUserId : undefined,
        partnerTag: metadata?.partnerTag ?? undefined,
      },
    });

    return mapToDomain(stats);
  }

  public async topMembers(limit: number): Promise<readonly MemberTradeStats[]> {
    const stats = await this.prisma.memberTradeStats.findMany({
      orderBy: [{ tradesCompleted: 'desc' }, { updatedAt: 'desc' }],
      take: limit,
    });

    return stats.map(mapToDomain);
  }

  private static isTransactionClient(value: TransactionContext): value is Prisma.TransactionClient {
    return typeof value === 'object' && value !== null && 'memberTradeStats' in value;
  }
}
