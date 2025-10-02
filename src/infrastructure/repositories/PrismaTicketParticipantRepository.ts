// =============================================================================
// RUTA: src/infrastructure/repositories/PrismaTicketParticipantRepository.ts
// =============================================================================

import type { Prisma, PrismaClient } from '@prisma/client';

import type {
  AddParticipantInput,
  ITicketParticipantRepository,
  TicketParticipant,
} from '@/domain/repositories/ITicketParticipantRepository';
import type { TransactionContext } from '@/domain/repositories/transaction';

type PrismaClientLike = PrismaClient | Prisma.TransactionClient;

type PrismaTicketParticipant = Prisma.TicketParticipantGetPayload<unknown>;

export class PrismaTicketParticipantRepository implements ITicketParticipantRepository {
  public constructor(private readonly prisma: PrismaClientLike) {}

  public withTransaction(context: TransactionContext): ITicketParticipantRepository {
    if (!PrismaTicketParticipantRepository.isTransactionClient(context)) {
      throw new Error('Invalid Prisma transaction context provided to ticket participant repository.');
    }

    return new PrismaTicketParticipantRepository(context);
  }

  public async addParticipant(input: AddParticipantInput): Promise<void> {
    await this.prisma.ticketParticipant.upsert({
      where: {
        ticketId_userId: {
          ticketId: input.ticketId,
          userId: input.userId,
        },
      },
      update: {
        role: input.role ?? null,
        joinedAt: input.joinedAt ?? new Date(),
      },
      create: {
        ticketId: input.ticketId,
        userId: input.userId,
        role: input.role ?? null,
        joinedAt: input.joinedAt ?? new Date(),
      },
    });
  }

  public async listByTicket(ticketId: number): Promise<readonly TicketParticipant[]> {
    const participants = await this.prisma.ticketParticipant.findMany({
      where: { ticketId },
    });

    return participants.map(PrismaTicketParticipantRepository.mapParticipant);
  }

  public async isParticipant(ticketId: number, userId: bigint): Promise<boolean> {
    const participant = await this.prisma.ticketParticipant.findUnique({
      where: {
        ticketId_userId: {
          ticketId,
          userId,
        },
      },
    });

    return participant !== null;
  }

  private static mapParticipant(participant: PrismaTicketParticipant): TicketParticipant {
    return {
      ticketId: participant.ticketId,
      userId: participant.userId,
      role: participant.role ?? null,
      joinedAt: participant.joinedAt,
    };
  }

  private static isTransactionClient(value: TransactionContext): value is Prisma.TransactionClient {
    return typeof value === 'object' && value !== null && 'ticketParticipant' in value;
  }
}
