// ============================================================================
// RUTA: src/application/usecases/tickets/CloseGeneralTicketUseCase.ts
// ============================================================================

import type { TextChannel } from 'discord.js';
import type { Logger } from 'pino';

import { type CloseTicketDTO,CloseTicketSchema } from '@/application/dto/ticket.dto';
import type { ITicketRepository } from '@/domain/repositories/ITicketRepository';
import type { EmbedFactory } from '@/presentation/embeds/EmbedFactory';
import { embedFactory } from '@/presentation/embeds/EmbedFactory';
import {
  TicketClosedError,
  TicketNotFoundError,
  UnauthorizedActionError,
} from '@/shared/errors/domain.errors';

interface CloseOptions {
  readonly executorIsStaff: boolean;
}

export class CloseGeneralTicketUseCase {
  public constructor(
    private readonly ticketRepository: ITicketRepository,
    private readonly logger: Logger,
    private readonly embeds: EmbedFactory = embedFactory,
  ) {}

  public async execute(
    payload: CloseTicketDTO,
    channel: TextChannel,
    options: CloseOptions,
  ): Promise<void> {
    const data = CloseTicketSchema.parse(payload);
    const ticket = await this.ticketRepository.findById(data.ticketId);

    if (!ticket || ticket.channelId.toString() !== channel.id) {
      throw new TicketNotFoundError(String(data.ticketId));
    }

    if (ticket.isClosed()) {
      throw new TicketClosedError(ticket.id);
    }

    const executorId = BigInt(data.executorId);
    const isOwner = ticket.isOwnedBy(executorId);

    if (!isOwner && !options.executorIsStaff) {
      const isParticipant = await this.ticketRepository.isParticipant(ticket.id, executorId);
      if (!isParticipant) {
        throw new UnauthorizedActionError('ticket:close');
      }
    }

    ticket.close();
    await this.ticketRepository.update(ticket);

    await channel.send({
      embeds: [
        this.embeds.success({
          title: 'Ticket cerrado',
          description:
            'El ticket se marcó como resuelto. Este canal será archivado automáticamente en unas horas.',
        }),
      ],
    });

    try {
      await channel.permissionOverwrites.edit(executorId.toString(), { SendMessages: false });
    } catch (error) {
      this.logger.warn({ err: error, channelId: channel.id }, 'No fue posible ajustar permisos del canal cerrado.');
    }

    try {
      await channel.setName(`closed-${channel.name}`.slice(0, 90));
    } catch (error) {
      this.logger.debug({ err: error, channelId: channel.id }, 'No se pudo renombrar el canal cerrado.');
    }

    this.logger.info(
      { ticketId: ticket.id, channelId: channel.id, executorId: data.executorId },
      'Ticket general cerrado correctamente.',
    );
  }
}
