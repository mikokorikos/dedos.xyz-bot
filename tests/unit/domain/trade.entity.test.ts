import { describe, expect, it } from 'vitest';

import { Trade, type TradeParticipantFinalization } from '@/domain/entities/Trade';
import type { TradeItem } from '@/domain/entities/types';
import { TradeStatus } from '@/domain/value-objects/TradeStatus';
import { InvalidTradeParticipantError, InvalidTradeStateError } from '@/shared/errors/domain.errors';

interface TradeOptions {
  readonly id?: number;
  readonly ticketId?: number;
  readonly userId?: bigint;
  readonly robloxUsername?: string;
  readonly robloxUserId?: bigint | null;
  readonly status?: TradeStatus;
  readonly confirmed?: boolean;
  readonly items?: TradeItem[];
  readonly finalizations?: TradeParticipantFinalization[];
  readonly createdAt?: Date;
}

const createTrade = (overrides: TradeOptions = {}) => {
  const items: TradeItem[] = overrides.items ?? [];
  const finalizations: TradeParticipantFinalization[] = overrides.finalizations ?? [];

  return new Trade(
    overrides.id ?? 1,
    overrides.ticketId ?? 10,
    overrides.userId ?? 20n,
    overrides.robloxUsername ?? 'Buyer',
    overrides.robloxUserId ?? null,
    overrides.status ?? TradeStatus.PENDING,
    overrides.confirmed ?? false,
    items,
    finalizations,
    overrides.createdAt ?? new Date('2024-01-01T00:00:00.000Z'),
  );
};

describe('Trade entity', () => {
  it('should attach and replace items', () => {
    const trade = createTrade({
      items: [
        { name: 'Item A', quantity: 1 },
        { name: 'Item B', quantity: 2 },
      ],
    });

    trade.attachItems([
      { name: 'Item C', quantity: 3 },
      { name: 'Item D', quantity: 4 },
    ]);

    expect(trade.items).toHaveLength(2);
    expect(trade.items[0]).toEqual({ name: 'Item C', quantity: 3 });
    expect(trade.items[1]).toEqual({ name: 'Item D', quantity: 4 });
  });

  it('should track participant confirmations', () => {
    const trade = createTrade();
    const participantId = 99n;

    trade.confirmParticipant(participantId);

    expect(trade.isParticipantConfirmed(participantId)).toBe(true);
    expect(trade.listParticipantFinalizations()).toHaveLength(1);
    expect(trade.listParticipantFinalizations()[0].userId).toBe(participantId);
  });

  it('should remove participant confirmations', () => {
    const trade = createTrade({ finalizations: [{ userId: 50n, confirmedAt: new Date() }] });

    trade.cancelParticipant(50n);

    expect(trade.isParticipantConfirmed(50n)).toBe(false);
    expect(trade.listParticipantFinalizations()).toHaveLength(0);
  });

  it('should throw when cancelling unknown participant', () => {
    const trade = createTrade();

    expect(() => trade.cancelParticipant(123n)).toThrow(InvalidTradeParticipantError);
  });

  it('should throw when confirming participants on cancelled trade', () => {
    const trade = createTrade({ status: TradeStatus.CANCELLED });

    expect(() => trade.confirmParticipant(1n)).toThrow(InvalidTradeStateError);
    expect(() => trade.attachItems([{ name: 'Item', quantity: 1 }])).toThrow(InvalidTradeStateError);
  });

  it('should expose status getter', () => {
    const trade = createTrade({ status: TradeStatus.ACTIVE });

    expect(trade.getStatus()).toBe(TradeStatus.ACTIVE);
  });
});
