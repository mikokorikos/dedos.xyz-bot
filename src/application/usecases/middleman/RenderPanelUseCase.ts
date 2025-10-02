// =============================================================================
// RUTA: src/application/usecases/middleman/RenderPanelUseCase.ts
// =============================================================================

import type { Logger } from 'pino';

import type { IMiddlemanRepository } from '@/domain/repositories/IMiddlemanRepository';
import type { ITicketRepository } from '@/domain/repositories/ITicketRepository';
import type { ITradeRepository } from '@/domain/repositories/ITradeRepository';
import { TradeStatus } from '@/domain/value-objects/TradeStatus';
import { TicketNotFoundError, UnauthorizedActionError } from '@/shared/errors/domain.errors';

export interface TradeParticipantViewModel {
  readonly userId: string;
  readonly confirmedAt: Date;
}

export interface TradeViewModel {
  readonly id: number;
  readonly userId: string;
  readonly robloxUsername: string;
  readonly robloxUserId: string | null;
  readonly status: TradeStatus;
  readonly confirmed: boolean;
  readonly items: ReadonlyArray<{ name: string; quantity: number; metadata?: Record<string, unknown> | null }>;
  readonly participantConfirmations: ReadonlyArray<TradeParticipantViewModel>;
}

export interface MiddlemanPanelViewModel {
  readonly ticketId: number;
  readonly channelId: string;
  readonly statusCounters: Record<TradeStatus, number>;
  readonly trades: ReadonlyArray<TradeViewModel>;
  readonly forcedClose: boolean;
  readonly middlemanId?: string;
}

const emptyCounters = (): Record<TradeStatus, number> => ({
  [TradeStatus.PENDING]: 0,
  [TradeStatus.ACTIVE]: 0,
  [TradeStatus.COMPLETED]: 0,
  [TradeStatus.CANCELLED]: 0,
});

export class RenderPanelUseCase {
  public constructor(
    private readonly ticketRepo: ITicketRepository,
    private readonly tradeRepo: ITradeRepository,
    private readonly middlemanRepo: IMiddlemanRepository,
    private readonly logger: Logger,
  ) {}

  public async execute(ticketId: number, requesterId: bigint): Promise<MiddlemanPanelViewModel> {
    const ticket = await this.ticketRepo.findById(ticketId);

    if (!ticket) {
      throw new TicketNotFoundError(String(ticketId));
    }

    const claim = await this.middlemanRepo.getClaimByTicket(ticketId);

    const isParticipant = await this.ticketRepo.isParticipant(ticketId, requesterId);
    const isOwner = ticket.isOwnedBy(requesterId);
    const isAssignedMiddleman = claim?.middlemanId === requesterId;

    if (!isOwner && !isParticipant && !isAssignedMiddleman) {
      throw new UnauthorizedActionError('middleman:panel:view');
    }

    const trades = await this.tradeRepo.findByTicketId(ticketId);
    const counters = emptyCounters();

    const tradeView: TradeViewModel[] = trades.map((trade) => {
      counters[trade.getStatus()] += 1;

      return {
        id: trade.id,
        userId: trade.userId.toString(),
        robloxUsername: trade.robloxUsername,
        robloxUserId: trade.robloxUserId ? trade.robloxUserId.toString() : null,
        status: trade.getStatus(),
        confirmed: trade.confirmed,
        items: trade.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          metadata: item.metadata ?? undefined,
        })),
        participantConfirmations: trade.listParticipantFinalizations().map((confirmation) => ({
          userId: confirmation.userId.toString(),
          confirmedAt: confirmation.confirmedAt,
        })),
      };
    });

    const viewModel: MiddlemanPanelViewModel = {
      ticketId: ticket.id,
      channelId: ticket.channelId.toString(),
      statusCounters: counters,
      trades: tradeView,
      forcedClose: claim?.forcedClose ?? false,
      middlemanId: claim?.middlemanId ? claim.middlemanId.toString() : undefined,
    };

    this.logger.debug({ ticketId, requesterId: requesterId.toString(), counters }, 'Panel de middleman renderizado.');

    return viewModel;
  }
}
