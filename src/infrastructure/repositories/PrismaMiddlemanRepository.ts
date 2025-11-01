// ============================================================================
// RUTA: src/infrastructure/repositories/PrismaMiddlemanRepository.ts
// ============================================================================

import type { Prisma, PrismaClient } from '@prisma/client';

import type { IMiddlemanRepository, MiddlemanClaim } from '@/domain/repositories/IMiddlemanRepository';
import type { TransactionContext } from '@/domain/repositories/transaction';

type PrismaClientLike = PrismaClient | Prisma.TransactionClient;

type PrismaClaim = Prisma.MiddlemanClaimGetPayload<Record<string, never>>;

export class PrismaMiddlemanRepository implements IMiddlemanRepository {
  public constructor(private readonly prisma: PrismaClientLike) {}

  public withTransaction(context: TransactionContext): IMiddlemanRepository {
    if (!PrismaMiddlemanRepository.isTransactionClient(context)) {
      throw new Error('Invalid Prisma transaction context provided to middleman repository.');
    }

    return new PrismaMiddlemanRepository(context);
  }

  public async isMiddleman(userId: bigint): Promise<boolean> {
    const middleman = await this.prisma.middleman.findUnique({ where: { userId } });
    return middleman !== null;
  }

  public async getClaimByTicket(ticketId: number): Promise<MiddlemanClaim | null> {
    const claim = await this.prisma.middlemanClaim.findUnique({ where: { ticketId } });
    return claim ? this.toDomain(claim) : null;
  }

  public async createClaim(ticketId: number, middlemanId: bigint): Promise<void> {
    await this.prisma.middlemanClaim.create({
      data: {
        ticketId,
        middlemanId,
      },
    });
  }

  public async markClosed(ticketId: number, payload: { closedAt: Date; forcedClose?: boolean }): Promise<void> {
    await this.prisma.middlemanClaim.update({
      where: { ticketId },
      data: {
        closedAt: payload.closedAt,
        forcedClose: payload.forcedClose ?? false,
      },
    });
  }

  public async markReviewRequested(ticketId: number, requestedAt: Date): Promise<void> {
    await this.prisma.middlemanClaim.update({
      where: { ticketId },
      data: { reviewRequestedAt: requestedAt },
    });
  }

  private toDomain(claim: PrismaClaim): MiddlemanClaim {
    return {
      ticketId: claim.ticketId,
      middlemanId: claim.middlemanId,
      claimedAt: claim.claimedAt,
      reviewRequestedAt: claim.reviewRequestedAt ?? undefined,
      closedAt: claim.closedAt ?? undefined,
      forcedClose: claim.forcedClose ?? undefined,
    };
  }

  private static isTransactionClient(value: TransactionContext): value is Prisma.TransactionClient {
    return typeof value === 'object' && value !== null && 'middlemanClaim' in value;
  }
}
