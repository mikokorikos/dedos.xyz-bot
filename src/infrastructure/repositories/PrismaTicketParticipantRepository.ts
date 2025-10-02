// =============================================================================
// RUTA: src/infrastructure/repositories/PrismaTicketParticipantRepository.ts
// =============================================================================

import type {
  Prisma,
  PrismaClient,
  TicketParticipant as PrismaTicketParticipantModel,
} from '@prisma/client';

import type { ITicketParticipantRepository, TicketParticipantRecord } from '@/domain/repositories/ITicketParticipantRepository';
import type { TicketParticipantInput } from '@/domain/repositories/ITicketRepository';
import type { TransactionContext } from '@/domain/repositories/transaction';

const mapParticipantInput = (ticketId: number, participant: TicketParticipantInput) => ({
  ticketId,
  userId: participant.userId,
  role: participant.role ?? null,
  joinedAt: participant.joinedAt ?? new Date(),
});

const mapRecord = (participant: PrismaTicketParticipantModel): TicketParticipantRecord => ({
  ticketId: participant.ticketId,
  userId: participant.userId,
  role: participant.role,
  joinedAt: participant.joinedAt,
});

type PrismaClientLike = PrismaClient | Prisma.TransactionClient;

export class PrismaTicketParticipantRepository implements ITicketParticipantRepository {
  public constructor(private readonly prisma: PrismaClientLike) {}

  public withTransaction(context: TransactionContext): ITicketParticipantRepository {
    if (!PrismaTicketParticipantRepository.isTransactionClient(context)) {
      throw new Error('Invalid Prisma transaction context provided to ticket participant repository.');
    }

    return new PrismaTicketParticipantRepository(context);
  }

  public async addMany(ticketId: number, participants: ReadonlyArray<TicketParticipantInput>): Promise<void> {
    if (participants.length === 0) {
      return;
    }

    await this.prisma.ticketParticipant.createMany({
      data: participants.map((participant) => mapParticipantInput(ticketId, participant)),
      skipDuplicates: true,
    });
  }

  public async remove(ticketId: number, userId: bigint): Promise<void> {
    await this.prisma.ticketParticipant.delete({
      where: {
        ticketId_userId: {
          ticketId,
          userId,
        },
      },
    });
  }

  public async list(ticketId: number): Promise<readonly TicketParticipantRecord[]> {
    const participants = await this.prisma.ticketParticipant.findMany({
      where: { ticketId },
      orderBy: { joinedAt: 'asc' },
    });

    return participants.map(mapRecord);
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

  private static isTransactionClient(value: TransactionContext): value is Prisma.TransactionClient {
    return typeof value === 'object' && value !== null && 'ticketParticipant' in value;
  }
}
