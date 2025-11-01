// ============================================================================
// RUTA: src/domain/repositories/IMiddlemanRepository.ts
// ============================================================================

import type { Transactional } from '@/domain/repositories/transaction';

export interface MiddlemanClaim {
  readonly ticketId: number;
  readonly middlemanId: bigint;
  readonly claimedAt: Date;
  readonly reviewRequestedAt?: Date | null;
  readonly closedAt?: Date | null;
  readonly forcedClose?: boolean;
}

export interface IMiddlemanRepository extends Transactional<IMiddlemanRepository> {
  isMiddleman(userId: bigint): Promise<boolean>;
  getClaimByTicket(ticketId: number): Promise<MiddlemanClaim | null>;
  createClaim(ticketId: number, middlemanId: bigint): Promise<void>;
  markClosed(ticketId: number, payload: { closedAt: Date; forcedClose?: boolean }): Promise<void>;
  markReviewRequested(ticketId: number, requestedAt: Date): Promise<void>;
}
