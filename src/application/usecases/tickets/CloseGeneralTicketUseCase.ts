// =============================================================================
// RUTA: src/application/usecases/tickets/CloseGeneralTicketUseCase.ts
// =============================================================================

import {
  type CloseGeneralTicketDTO,
  CloseGeneralTicketSchema,
} from '@/application/dto/ticket.dto';
import { TicketType } from '@/domain/entities/types';
import type { ITicketParticipantRepository } from '@/domain/repositories/ITicketParticipantRepository';
import type { ITicketRepository } from '@/domain/repositories/ITicketRepository';
import {
  TicketClosedError,
  TicketNotFoundError,
  TicketParticipantNotFoundError,
  UnauthorizedActionError,
} from '@/shared/errors/domain.errors';
import type { Logger } from '@/shared/logger/pino';

export class CloseGeneralTicketUseCase {
  public constructor(
    private readonly ticketRepo: ITicketRepository,
    private readonly participantRepo: ITicketParticipantRepository,
    private readonly logger: Logger,
  ) {}

  public async execute(dto: CloseGeneralTicketDTO): Promise<void> {
    const payload = CloseGeneralTicketSchema.parse(dto);
    const ticket = await this.ticketRepo.findById(payload.ticketId);

    if (!ticket) {
      throw new TicketNotFoundError(String(payload.ticketId));
    }

    if (ticket.type === TicketType.MM) {
      throw new UnauthorizedActionError('ticket:general:close:unsupported-type');
    }

    if (ticket.isClosed()) {
      throw new TicketClosedError(ticket.id);
    }

    const executorId = BigInt(payload.executorId);
    const isParticipant = await this.participantRepo.isParticipant(ticket.id, executorId);

    if (!isParticipant && !payload.allowStaffOverride) {
      throw new TicketParticipantNotFoundError(ticket.id, payload.executorId);
    }

    ticket.close();
    await this.ticketRepo.update(ticket);

    this.logger.info(
      { ticketId: ticket.id, executorId: payload.executorId },
      'Ticket general cerrado correctamente.',
    );
  }
}
