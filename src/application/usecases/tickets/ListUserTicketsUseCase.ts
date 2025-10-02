// =============================================================================
// RUTA: src/application/usecases/tickets/ListUserTicketsUseCase.ts
// =============================================================================

import {
  type ListUserTicketsDTO,
  ListUserTicketsSchema,
} from '@/application/dto/ticket.dto';
import { TicketStatus, TicketType } from '@/domain/entities/types';
import type { ITicketRepository } from '@/domain/repositories/ITicketRepository';

const OPEN_STATUSES: readonly TicketStatus[] = [
  TicketStatus.OPEN,
  TicketStatus.CONFIRMED,
  TicketStatus.CLAIMED,
];

export class ListUserTicketsUseCase {
  public constructor(private readonly ticketRepo: ITicketRepository) {}

  public async execute(dto: ListUserTicketsDTO) {
    const payload = ListUserTicketsSchema.parse(dto);
    const ownerId = BigInt(payload.userId);
    const guildId = BigInt(payload.guildId);

    const tickets = await this.ticketRepo.findByOwner(ownerId, {
      guildId,
      statuses: payload.includeClosed ? undefined : [...OPEN_STATUSES],
      limit: payload.limit,
    });

    return tickets.filter((ticket) => ticket.type !== TicketType.MM);
  }
}
