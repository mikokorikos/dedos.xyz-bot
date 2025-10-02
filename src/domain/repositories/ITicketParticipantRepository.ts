// =============================================================================
// RUTA: src/domain/repositories/ITicketParticipantRepository.ts
// =============================================================================

import type { Transactional } from '@/domain/repositories/transaction';

export interface TicketParticipant {
  readonly ticketId: number;
  readonly userId: bigint;
  readonly role: string | null;
  readonly joinedAt: Date;
}

export interface AddParticipantInput {
  readonly ticketId: number;
  readonly userId: bigint;
  readonly role?: string | null;
  readonly joinedAt?: Date;
}

export interface ITicketParticipantRepository extends Transactional<ITicketParticipantRepository> {
  addParticipant(input: AddParticipantInput): Promise<void>;
  listByTicket(ticketId: number): Promise<readonly TicketParticipant[]>;
  isParticipant(ticketId: number, userId: bigint): Promise<boolean>;
}
