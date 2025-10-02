// =============================================================================
// RUTA: src/application/usecases/tickets/ListUserTicketsUseCase.ts
// =============================================================================

import type { Logger } from 'pino';

import type { Ticket } from '@/domain/entities/Ticket';
import type { ITicketRepository } from '@/domain/repositories/ITicketRepository';
import type { TicketStatus, TicketType } from '@/domain/entities/types';

export interface TicketSummary {
  readonly id: number;
  readonly type: TicketType;
  readonly status: TicketStatus;
  readonly createdAt: Date;
  readonly closedAt?: Date;
}

export interface ListUserTicketsResult {
  readonly open: readonly TicketSummary[];
  readonly recent: readonly TicketSummary[];
}

export class ListUserTicketsUseCase {
  public constructor(
    private readonly ticketRepo: ITicketRepository,
    private readonly logger: Logger,
  ) {}

  public async execute(userId: string | bigint, limit = 10): Promise<ListUserTicketsResult> {
    const ownerId = typeof userId === 'bigint' ? userId : BigInt(userId);
    this.logger.debug({ ownerId: ownerId.toString(), limit }, 'Listing tickets for user.');

    const [openTickets, recentTickets] = await Promise.all([
      this.ticketRepo.findOpenByOwner(ownerId),
      this.ticketRepo.findRecentByOwner(ownerId, limit),
    ]);

    const mapTicket = (ticket: Ticket): TicketSummary => ({
      id: ticket.id,
      type: ticket.type,
      status: ticket.status,
      createdAt: ticket.createdAt,
      closedAt: ticket.closedAt,
    });

    return {
      open: openTickets.map(mapTicket),
      recent: recentTickets.map(mapTicket),
    };
  }
}
