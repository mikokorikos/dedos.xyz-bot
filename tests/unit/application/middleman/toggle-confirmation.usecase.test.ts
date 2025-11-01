import type { Logger } from 'pino';
import { describe, expect, it, vi } from 'vitest';

import { ToggleConfirmationUseCase } from '@/application/usecases/middleman/ToggleConfirmationUseCase';
import { Trade } from '@/domain/entities/Trade';
import type { IMiddlemanRepository } from '@/domain/repositories/IMiddlemanRepository';
import type { ITicketRepository } from '@/domain/repositories/ITicketRepository';
import type { ITradeRepository } from '@/domain/repositories/ITradeRepository';
import { TradeStatus } from '@/domain/value-objects/TradeStatus';
import { UnauthorizedActionError } from '@/shared/errors/domain.errors';

const createTrade = (confirmed = false) =>
  new Trade(
    1,
    10,
    200n,
    'Buyer',
    null,
    TradeStatus.ACTIVE,
    true,
    [],
    confirmed ? [{ userId: 999n, confirmedAt: new Date('2024-01-01T00:00:00.000Z') }] : [],
    new Date('2024-01-01T00:00:00.000Z'),
  );

describe('ToggleConfirmationUseCase', () => {
  const createUseCase = () => {
    const ticketRepo: Partial<ITicketRepository> = {
      findById: vi.fn(),
      isParticipant: vi.fn(),
    };
    const tradeRepo: Partial<ITradeRepository> = {
      findById: vi.fn(),
      cancelParticipant: vi.fn(),
      confirmParticipant: vi.fn(),
      listParticipantFinalizations: vi.fn(),
    };
    const middlemanRepo: Partial<IMiddlemanRepository> = {
      getClaimByTicket: vi.fn(),
    };
    const logger: Partial<Logger> = { info: vi.fn() };

    const useCase = new ToggleConfirmationUseCase(
      ticketRepo as ITicketRepository,
      tradeRepo as ITradeRepository,
      middlemanRepo as IMiddlemanRepository,
      logger as Logger,
    );

    return { useCase, ticketRepo, tradeRepo, middlemanRepo };
  };

  it('confirms participant when not previously confirmed', async () => {
    const { useCase, ticketRepo, tradeRepo, middlemanRepo } = createUseCase();
    const trade = createTrade(false);

    (tradeRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(trade);
    (ticketRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 10, isOwnedBy: () => false });
    (ticketRepo.isParticipant as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (middlemanRepo.getClaimByTicket as ReturnType<typeof vi.fn>).mockResolvedValue({ middlemanId: 111n });
    (tradeRepo.listParticipantFinalizations as ReturnType<typeof vi.fn>).mockResolvedValue([
      { userId: 999n, confirmedAt: new Date('2024-01-01T00:00:00.000Z') },
    ]);

    const result = await useCase.execute(1, 999n);

    expect(result.confirmed).toBe(true);
    const call = (tradeRepo.confirmParticipant as ReturnType<typeof vi.fn>).mock.calls.at(0);
    expect(call?.[0]).toBe(1);
    expect(call?.[1]).toBe(999n);
  });

  it('cancels confirmation when already confirmed', async () => {
    const { useCase, ticketRepo, tradeRepo, middlemanRepo } = createUseCase();
    const trade = createTrade(true);

    (tradeRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(trade);
    (ticketRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 10, isOwnedBy: () => false });
    (ticketRepo.isParticipant as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (middlemanRepo.getClaimByTicket as ReturnType<typeof vi.fn>).mockResolvedValue({ middlemanId: 111n });
    (tradeRepo.listParticipantFinalizations as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await useCase.execute(1, 999n);

    expect(result.confirmed).toBe(false);
    expect(tradeRepo.cancelParticipant).toHaveBeenCalledWith(1, 999n);
  });

  it('throws when user is not allowed', async () => {
    const { useCase, ticketRepo, tradeRepo, middlemanRepo } = createUseCase();
    const trade = createTrade(false);

    (tradeRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(trade);
    (ticketRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 10, isOwnedBy: () => false });
    (ticketRepo.isParticipant as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    (middlemanRepo.getClaimByTicket as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(useCase.execute(1, 999n)).rejects.toBeInstanceOf(UnauthorizedActionError);
  });
});
