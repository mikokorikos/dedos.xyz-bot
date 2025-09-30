// ============================================================================
// RUTA: src/domain/repositories/IMemberStatsRepository.ts
// ============================================================================

import type { MemberTradeStats } from '@/domain/entities/MemberTradeStats';
import type { Transactional } from '@/domain/repositories/transaction';

export interface TradeMetadata {
  readonly robloxUsername?: string;
  readonly robloxUserId?: bigint | null;
  readonly partnerTag?: string;
}

export interface IMemberStatsRepository extends Transactional<IMemberStatsRepository> {
  getByUserId(userId: bigint): Promise<MemberTradeStats | null>;
  recordCompletedTrade(userId: bigint, completedAt: Date, metadata?: TradeMetadata): Promise<MemberTradeStats>;
  topMembers(limit: number): Promise<readonly MemberTradeStats[]>;
}
