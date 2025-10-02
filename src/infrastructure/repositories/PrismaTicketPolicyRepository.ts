// =============================================================================
// RUTA: src/infrastructure/repositories/PrismaTicketPolicyRepository.ts
// =============================================================================

import type { Prisma, PrismaClient } from '@prisma/client';

import { TicketStatus, type TicketType } from '@/domain/entities/types';
import type {
  ITicketPolicyRepository,
  TicketPolicySnapshot,
} from '@/domain/repositories/ITicketPolicyRepository';
import type { TransactionContext } from '@/domain/repositories/transaction';

type PrismaClientLike = PrismaClient | Prisma.TransactionClient;

export class PrismaTicketPolicyRepository implements ITicketPolicyRepository {
  public constructor(private readonly prisma: PrismaClientLike) {}

  public withTransaction(context: TransactionContext): ITicketPolicyRepository {
    if (!PrismaTicketPolicyRepository.isTransactionClient(context)) {
      throw new Error('Invalid Prisma transaction context provided to ticket policy repository.');
    }

    return new PrismaTicketPolicyRepository(context);
  }

  public async getSnapshot(ownerId: bigint, type: TicketType): Promise<TicketPolicySnapshot> {
    const [openCount, lastOpened, lastClosed] = await Promise.all([
      this.prisma.ticket.count({
        where: {
          ownerId,
          type,
          status: { in: [TicketStatus.OPEN, TicketStatus.CONFIRMED, TicketStatus.CLAIMED] },
        },
      }),
      this.prisma.ticket.findFirst({
        where: {
          ownerId,
          type,
        },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
      this.prisma.ticket.findFirst({
        where: {
          ownerId,
          type,
          status: TicketStatus.CLOSED,
          closedAt: { not: null },
        },
        orderBy: { closedAt: 'desc' },
        select: { closedAt: true },
      }),
    ]);

    return {
      openCount,
      lastOpenedAt: lastOpened?.createdAt,
      lastClosedAt: lastClosed?.closedAt ?? undefined,
    };
  }

  private static isTransactionClient(value: TransactionContext): value is Prisma.TransactionClient {
    return typeof value === 'object' && value !== null && 'ticket' in value;
  }
}
