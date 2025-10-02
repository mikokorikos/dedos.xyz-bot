import { beforeEach, describe, expect, it } from 'vitest';

import { PrismaTicketParticipantRepository } from '@/infrastructure/repositories/PrismaTicketParticipantRepository';
import { PrismaTicketPolicyRepository } from '@/infrastructure/repositories/PrismaTicketPolicyRepository';
import { TicketStatus, TicketType } from '@/domain/entities/types';

interface StoredTicket {
  id: number;
  ownerId: bigint;
  guildId: bigint;
  channelId: bigint;
  type: TicketType;
  status: TicketStatus;
  createdAt: Date;
  closedAt?: Date | null;
}

interface StoredParticipant {
  ticketId: number;
  userId: bigint;
  role: string | null;
  joinedAt: Date;
}

class FakePrismaClient {
  private tickets = new Map<number, StoredTicket>();
  private participants = new Map<string, StoredParticipant>();
  private ticketSeq = 1;

  public readonly ticket = {
    create: async (args: any) => {
      const id = this.ticketSeq++;
      const record: StoredTicket = {
        id,
        ownerId: args.data.ownerId,
        guildId: args.data.guildId,
        channelId: args.data.channelId,
        type: args.data.type,
        status: args.data.status ?? TicketStatus.OPEN,
        createdAt: args.data.createdAt ?? new Date(),
        closedAt: args.data.closedAt ?? null,
      };
      this.tickets.set(id, record);
      return record;
    },
    count: async (args: any) => {
      const statuses: TicketStatus[] | undefined = args.where?.status?.in;
      let count = 0;
      for (const ticket of this.tickets.values()) {
        if (ticket.ownerId !== args.where.ownerId) {
          continue;
        }
        if (ticket.type !== args.where.type) {
          continue;
        }
        if (statuses && !statuses.includes(ticket.status)) {
          continue;
        }
        count++;
      }
      return count;
    },
    findFirst: async (args: any) => {
      const tickets = Array.from(this.tickets.values()).filter((ticket) => {
        if (args.where?.ownerId !== undefined && ticket.ownerId !== args.where.ownerId) {
          return false;
        }
        if (args.where?.type !== undefined && ticket.type !== args.where.type) {
          return false;
        }
        if (args.where?.status !== undefined && ticket.status !== args.where.status) {
          return false;
        }
        if (args.where?.closedAt?.not === null && ticket.closedAt === null) {
          return false;
        }
        return true;
      });

      if (tickets.length === 0) {
        return null;
      }

      tickets.sort((a, b) => {
        const order = args.orderBy?.createdAt === 'desc' || args.orderBy?.closedAt === 'desc' ? -1 : 1;
        const left = args.orderBy?.createdAt ? a.createdAt.getTime() : (a.closedAt?.getTime() ?? 0);
        const right = args.orderBy?.createdAt ? b.createdAt.getTime() : (b.closedAt?.getTime() ?? 0);
        return order * (left - right);
      });

      const ticket = tickets[0];

      if (args.select?.createdAt) {
        return { createdAt: ticket.createdAt };
      }

      if (args.select?.closedAt) {
        return { closedAt: ticket.closedAt };
      }

      return ticket;
    },
  };

  public readonly ticketParticipant = {
    upsert: async (args: any) => {
      const key = `${args.where.ticketId_userId.ticketId}:${args.where.ticketId_userId.userId}`;
      const participant: StoredParticipant = {
        ticketId: args.create.ticketId,
        userId: args.create.userId,
        role: args.create.role ?? null,
        joinedAt: args.create.joinedAt ?? new Date(),
      };
      this.participants.set(key, participant);
      return participant;
    },
    findMany: async (args: any) => {
      return Array.from(this.participants.values()).filter((participant) => participant.ticketId === args.where.ticketId);
    },
    findUnique: async (args: any) => {
      const key = `${args.where.ticketId_userId.ticketId}:${args.where.ticketId_userId.userId}`;
      return this.participants.get(key) ?? null;
    },
  };

  public async $transaction<T>(callback: (tx: FakePrismaClient) => Promise<T>): Promise<T> {
    return callback(this);
  }
}

describe('Prisma ticket repositories', () => {
  let prisma: FakePrismaClient;

  beforeEach(() => {
    prisma = new FakePrismaClient();
  });

  it('should return policy snapshot with counts and timestamps', async () => {
    const repo = new PrismaTicketPolicyRepository(prisma as any);

    await prisma.ticket.create({
      data: {
        ownerId: 1n,
        guildId: 1n,
        channelId: 10n,
        type: TicketType.BUY,
        status: TicketStatus.OPEN,
        createdAt: new Date('2024-06-01T10:00:00.000Z'),
      },
    });
    await prisma.ticket.create({
      data: {
        ownerId: 1n,
        guildId: 1n,
        channelId: 11n,
        type: TicketType.BUY,
        status: TicketStatus.CLOSED,
        createdAt: new Date('2024-05-31T09:00:00.000Z'),
        closedAt: new Date('2024-05-31T12:00:00.000Z'),
      },
    });

    const snapshot = await repo.getSnapshot(1n, TicketType.BUY);
    expect(snapshot.openCount).toBe(1);
    expect(snapshot.lastOpenedAt?.toISOString()).toBe('2024-06-01T10:00:00.000Z');
    expect(snapshot.lastClosedAt?.toISOString()).toBe('2024-05-31T12:00:00.000Z');
  });

  it('should manage participants with upsert semantics', async () => {
    const repo = new PrismaTicketParticipantRepository(prisma as any);

    await repo.addParticipant({ ticketId: 100, userId: 55n, role: 'OWNER', joinedAt: new Date('2024-06-01T12:00:00.000Z') });
    await repo.addParticipant({ ticketId: 100, userId: 60n, role: 'PARTNER' });

    const participants = await repo.listByTicket(100);
    expect(participants).toHaveLength(2);

    const isParticipant = await repo.isParticipant(100, 55n);
    expect(isParticipant).toBe(true);
  });
});
