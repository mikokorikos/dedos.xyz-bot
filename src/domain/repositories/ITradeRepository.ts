// ============================================================================
// RUTA: src/domain/repositories/ITradeRepository.ts
// ============================================================================

import type { Trade, TradeParticipantFinalization } from '@/domain/entities/Trade';
import type { TradeItem } from '@/domain/entities/types';
import type { Transactional } from '@/domain/repositories/transaction';
import type { TradeStatus } from '@/domain/value-objects/TradeStatus';

export interface CreateTradeData {
  readonly ticketId: number;
  readonly userId: bigint;
  readonly robloxUsername: string;
  readonly robloxUserId?: bigint | null;
  readonly status?: TradeStatus;
  readonly confirmed?: boolean;
  readonly items?: ReadonlyArray<TradeItem>;
}

export interface ITradeRepository extends Transactional<ITradeRepository> {
  create(data: CreateTradeData): Promise<Trade>;
  findById(id: number): Promise<Trade | null>;
  findByTicketId(ticketId: number): Promise<readonly Trade[]>;
  findByUserId(userId: bigint): Promise<readonly Trade[]>;
  update(trade: Trade): Promise<void>;
  confirmParticipant(tradeId: number, userId: bigint, confirmedAt?: Date): Promise<void>;
  cancelParticipant(tradeId: number, userId: bigint): Promise<void>;
  replaceItems(tradeId: number, items: ReadonlyArray<TradeItem>): Promise<void>;
  listParticipantFinalizations(ticketId: number): Promise<readonly TradeParticipantFinalization[]>;
  delete(id: number): Promise<void>;
}
