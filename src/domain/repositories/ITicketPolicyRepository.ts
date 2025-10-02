// =============================================================================
// RUTA: src/domain/repositories/ITicketPolicyRepository.ts
// =============================================================================

import type { TicketType } from '@/domain/entities/types';
import type { Transactional } from '@/domain/repositories/transaction';

export interface TicketPolicySnapshot {
  readonly openCount: number;
  readonly lastOpenedAt?: Date;
  readonly lastClosedAt?: Date;
}

export interface ITicketPolicyRepository extends Transactional<ITicketPolicyRepository> {
  getSnapshot(ownerId: bigint, type: TicketType): Promise<TicketPolicySnapshot>;
}
