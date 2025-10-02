import { beforeEach, describe, expect, it } from 'vitest';

import { TradeStatus } from '@/domain/value-objects/TradeStatus';
import { PrismaTradeRepository } from '@/infrastructure/repositories/PrismaTradeRepository';

type StoredTrade = {
  id: number;
  ticketId: number;
  userId: bigint;
  robloxUsername: string;
  robloxUserId: bigint | null;
  status: TradeStatus;
  confirmed: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type StoredItem = {
  id: number;
  tradeId: number;
  itemName: string;
  quantity: number;
  metadata: Record<string, unknown> | null;
};

type StoredFinalization = {
  ticketId: number;
  userId: bigint;
  confirmedAt: Date;
};

const toItem = (item: StoredItem) => ({
  id: item.id,
  itemName: item.itemName,
  quantity: item.quantity,
  metadata: item.metadata,
});

const toFinalization = (finalization: StoredFinalization) => ({
  ticketId: finalization.ticketId,
  userId: finalization.userId,
  confirmedAt: finalization.confirmedAt,
});

class FakePrismaClient {
  private trades = new Map<number, StoredTrade>();
  private items = new Map<number, StoredItem[]>();
  private finalizations = new Map<number, Map<bigint, StoredFinalization>>();
  private tradeIdSeq = 1;
  private itemIdSeq = 1;

  public readonly middlemanTrade = {
    create: async (args: any) => {
      const id = this.tradeIdSeq++;
      const now = new Date();
      const trade: StoredTrade = {
        id,
        ticketId: args.data.ticketId,
        userId: args.data.userId,
        robloxUsername: args.data.robloxUsername,
        robloxUserId: args.data.robloxUserId ?? null,
        status: args.data.status ?? TradeStatus.PENDING,
        confirmed: args.data.confirmed ?? false,
        createdAt: now,
        updatedAt: now,
      };

      this.trades.set(id, trade);
      this.items.set(id, []);

      if (args.data.items?.create) {
        const createdItems: StoredItem[] = args.data.items.create.map((item: any) => ({
          id: this.itemIdSeq++,
          tradeId: id,
          itemName: item.itemName,
          quantity: item.quantity ?? 1,
          metadata: item.metadata ?? null,
        }));
        this.items.set(id, createdItems);
      }

      return this.buildTradePayload(id, args.include);
    },
    findUnique: async (args: any) => {
      const trade = this.trades.get(args.where.id);
      if (!trade) {
        return null;
      }

      if (args.select) {
        const result: any = {};
        if (args.select.ticketId) {
          result.ticketId = trade.ticketId;
        }
        return result;
      }

      return this.buildTradePayload(trade.id, args.include);
    },
    findMany: async (args: any) => {
      const { where } = args;
      const trades = Array.from(this.trades.values()).filter((trade) => {
        if (where?.ticketId !== undefined && trade.ticketId !== where.ticketId) {
          return false;
        }
        if (where?.userId !== undefined && trade.userId !== where.userId) {
          return false;
        }
        return true;
      });

      return trades.map((trade) => this.buildTradePayload(trade.id, args.include));
    },
    update: async (args: any) => {
      const trade = this.trades.get(args.where.id);
      if (!trade) {
        throw new Error('Trade not found');
      }

      const updated: StoredTrade = {
        ...trade,
        status: args.data.status ?? trade.status,
        confirmed: args.data.confirmed ?? trade.confirmed,
        robloxUserId: args.data.robloxUserId ?? trade.robloxUserId,
        updatedAt: new Date(),
      };

      this.trades.set(trade.id, updated);
      return this.buildTradePayload(trade.id, args.include);
    },
    delete: async (args: any) => {
      this.trades.delete(args.where.id);
      this.items.delete(args.where.id);
      return { id: args.where.id };
    },
  };

  public readonly middlemanTradeItem = {
    deleteMany: async (args: any) => {
      if (args.where?.tradeId !== undefined) {
        this.items.set(args.where.tradeId, []);
      }
    },
    createMany: async (args: any) => {
      for (const item of args.data as Array<any>) {
        const stored: StoredItem = {
          id: this.itemIdSeq++,
          tradeId: item.tradeId,
          itemName: item.itemName,
          quantity: item.quantity ?? 1,
          metadata: item.metadata ?? null,
        };

        const list = this.items.get(item.tradeId) ?? [];
        list.push(stored);
        this.items.set(item.tradeId, list);
      }
    },
  };

  public readonly middlemanTradeFinalization = {
    findMany: async (args: any) => {
      return this.getFinalizationsArray(args.where?.ticketId);
    },
    upsert: async (args: any) => {
      const { ticketId, userId } = args.where.ticketId_userId;
      const map = this.ensureFinalizationMap(ticketId);
      const finalization: StoredFinalization = {
        ticketId,
        userId,
        confirmedAt: args.create.confirmedAt ?? args.update.confirmedAt ?? new Date(),
      };
      map.set(userId, finalization);
    },
    deleteMany: async (args: any) => {
      if (args.where?.ticketId === undefined) {
        return;
      }
      const map = this.finalizations.get(args.where.ticketId);
      if (!map) {
        return;
      }
      if (args.where.userId !== undefined) {
        map.delete(args.where.userId);
      }
    },
  };

  private buildTradePayload(id: number, include?: any) {
    const trade = this.trades.get(id);
    if (!trade) {
      return null;
    }

    const payload: any = { ...trade };

    if (!include || include.items) {
      payload.items = (this.items.get(id) ?? []).map(toItem);
    }

    if (!include) {
      payload.ticket = { finalizations: this.getFinalizationsArray(trade.ticketId) };
    } else if (include.ticket?.select?.finalizations) {
      payload.ticket = { finalizations: this.getFinalizationsArray(trade.ticketId) };
    }

    return payload;
  }

  private ensureFinalizationMap(ticketId: number) {
    if (!this.finalizations.has(ticketId)) {
      this.finalizations.set(ticketId, new Map());
    }

    return this.finalizations.get(ticketId)!;
  }

  private getFinalizationsArray(ticketId: number | undefined): StoredFinalization[] {
    if (ticketId === undefined) {
      return [];
    }

    const map = this.finalizations.get(ticketId);
    if (!map) {
      return [];
    }

    return Array.from(map.values()).map(toFinalization);
  }
}

describe('PrismaTradeRepository (integration)', () => {
  let prisma: FakePrismaClient;
  let repository: PrismaTradeRepository;

  beforeEach(() => {
    prisma = new FakePrismaClient();
    repository = new PrismaTradeRepository(prisma as unknown as any);
  });

  it('replaces trade items', async () => {
    const trade = await repository.create({
      ticketId: 1,
      userId: 10n,
      robloxUsername: 'Buyer',
      items: [
        { name: 'Old', quantity: 1 },
      ],
    });

    await repository.replaceItems(trade.id, [
      { name: 'New Item', quantity: 2 },
      { name: 'Another', quantity: 3 },
    ]);

    const updated = await repository.findById(trade.id);
    expect(updated?.items).toHaveLength(2);
    expect(updated?.items[0].name).toBe('New Item');
    expect(updated?.items[1].quantity).toBe(3);
  });

  it('registers and removes participant confirmations', async () => {
    const trade = await repository.create({
      ticketId: 2,
      userId: 20n,
      robloxUsername: 'Seller',
    });

    await repository.confirmParticipant(trade.id, 99n, new Date('2024-01-01T00:00:00.000Z'));

    let finalizations = await repository.listParticipantFinalizations(trade.ticketId);
    expect(finalizations).toHaveLength(1);
    expect(finalizations[0].userId).toBe(99n);

    await repository.cancelParticipant(trade.id, 99n);
    finalizations = await repository.listParticipantFinalizations(trade.ticketId);
    expect(finalizations).toHaveLength(0);
  });

  it('includes participant finalizations when retrieving trades', async () => {
    const trade = await repository.create({
      ticketId: 3,
      userId: 30n,
      robloxUsername: 'Partner',
    });

    await repository.confirmParticipant(trade.id, 123n, new Date('2024-01-02T00:00:00.000Z'));

    const trades = await repository.findByTicketId(3);
    expect(trades).toHaveLength(1);
    expect(trades[0].listParticipantFinalizations()).toHaveLength(1);
    expect(trades[0].listParticipantFinalizations()[0].userId).toBe(123n);
  });
});
