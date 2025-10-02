// =============================================================================
// RUTA: src/domain/repositories/ITicketTypePolicyRepository.ts
// =============================================================================

import type { TicketType } from '@/domain/entities/types';
import type { Transactional } from '@/domain/repositories/transaction';

export interface TicketTypePolicy {
  readonly type: TicketType;
  readonly maxOpenPerUser: number;
  readonly cooldownSeconds: number;
  readonly staffRoleId?: bigint;
  readonly requiresStaffApproval: boolean;
}

export interface TicketTypeCooldown {
  readonly type: TicketType;
  readonly userId: bigint;
  readonly lastOpenedAt: Date;
}

export interface ITicketTypePolicyRepository
  extends Transactional<ITicketTypePolicyRepository> {
  getPolicy(type: TicketType): Promise<TicketTypePolicy | null>;
  getAllPolicies(): Promise<readonly TicketTypePolicy[]>;
  getCooldown(type: TicketType, userId: bigint): Promise<TicketTypeCooldown | null>;
  upsertCooldown(type: TicketType, userId: bigint, openedAt: Date): Promise<void>;
}
