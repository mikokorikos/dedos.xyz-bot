// ============================================================================
// RUTA: src/domain/repositories/IMemberStatsRepository.ts
// ============================================================================

import type { Transactional } from '@/domain/repositories/transaction';

export interface IMemberStatsRepository extends Transactional<IMemberStatsRepository> {
  recordCompletedTrade(userId: bigint, completedAt: Date): Promise<void>;
}
