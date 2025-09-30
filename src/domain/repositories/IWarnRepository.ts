// ============================================================================
// RUTA: src/domain/repositories/IWarnRepository.ts
// ============================================================================

import type { WarnSeverity } from '@/domain/entities/types';
import type { Warn } from '@/domain/entities/Warn';
import type { Transactional } from '@/domain/repositories/transaction';

export interface CreateWarnData {
  readonly userId: bigint;
  readonly moderatorId?: bigint | null;
  readonly severity: WarnSeverity;
  readonly reason?: string | null;
}

export interface WarnSummary {
  readonly total: number;
  readonly weightedScore: number;
  readonly lastWarnAt: Date | null;
}

export interface IWarnRepository extends Transactional<IWarnRepository> {
  create(data: CreateWarnData): Promise<Warn>;
  remove(id: number): Promise<void>;
  listByUser(userId: bigint): Promise<readonly Warn[]>;
  getSummary(userId: bigint): Promise<WarnSummary>;
}
