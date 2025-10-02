// =============================================================================
// RUTA: src/domain/repositories/ITicketParticipantRepository.ts
// =============================================================================

import type { TicketParticipantInput } from '@/domain/repositories/ITicketRepository';
import type { Transactional } from '@/domain/repositories/transaction';

export interface TicketParticipantRecord {
  readonly ticketId: number;
  readonly userId: bigint;
  readonly role: string | null;
  readonly joinedAt: Date;
}

export interface ITicketParticipantRepository
  extends Transactional<ITicketParticipantRepository> {
  addMany(ticketId: number, participants: ReadonlyArray<TicketParticipantInput>): Promise<void>;
  remove(ticketId: number, userId: bigint): Promise<void>;
  list(ticketId: number): Promise<readonly TicketParticipantRecord[]>;
  isParticipant(ticketId: number, userId: bigint): Promise<boolean>;
}
