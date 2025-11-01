// ============================================================================
// RUTA: src/application/usecases/middleman/ClaimTradeUseCase.ts
// ============================================================================

import type { TextChannel } from 'discord.js';
import type { Logger } from 'pino';

import { type ClaimTicketDTO,ClaimTicketSchema } from '@/application/dto/ticket.dto';
import { TicketStatus } from '@/domain/entities/types';
import type { IMiddlemanRepository } from '@/domain/repositories/IMiddlemanRepository';
import type { ITicketRepository } from '@/domain/repositories/ITicketRepository';
import type { EmbedFactory } from '@/presentation/embeds/EmbedFactory';
import { embedFactory } from '@/presentation/embeds/EmbedFactory';
import {
  TicketAlreadyClaimedError,
  TicketNotFoundError,
  UnauthorizedActionError,
} from '@/shared/errors/domain.errors';

export class ClaimTradeUseCase {
  public constructor(
    private readonly ticketRepo: ITicketRepository,
    private readonly middlemanRepo: IMiddlemanRepository,
    private readonly logger: Logger,
    private readonly embeds: EmbedFactory = embedFactory,
  ) {}

  public async execute(dto: ClaimTicketDTO, channel: TextChannel): Promise<void> {
    const payload = ClaimTicketSchema.parse(dto);
    const ticket = await this.ticketRepo.findById(payload.ticketId);

    if (!ticket) {
      throw new TicketNotFoundError(String(payload.ticketId));
    }

    if (ticket.status === TicketStatus.CLAIMED || ticket.assignedMiddlemanId) {
      throw new TicketAlreadyClaimedError(ticket.id);
    }

    const middlemanId = BigInt(payload.middlemanId);
    const isMiddleman = await this.middlemanRepo.isMiddleman(middlemanId);
    if (!isMiddleman) {
      throw new UnauthorizedActionError('middleman:claim');
    }

    const existingClaim = await this.middlemanRepo.getClaimByTicket(ticket.id);
    if (existingClaim) {
      throw new TicketAlreadyClaimedError(ticket.id);
    }

    ticket.claim(middlemanId);

    await this.middlemanRepo.createClaim(ticket.id, middlemanId);
    await this.ticketRepo.update(ticket);

    await channel.permissionOverwrites.edit(payload.middlemanId, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
      ManageMessages: false,
      ManageChannels: false,
    });

    await channel.send({
      content: `<@${payload.middlemanId}> ha reclamado este ticket.`,
      embeds: [
        this.embeds.info({
          title: 'Ticket reclamado',
          description: 'El middleman se ha unido al canal para ayudarte con tu transacción.',
        }),
      ],
    });

    this.logger.info(
      { ticketId: ticket.id, channelId: channel.id, middlemanId: payload.middlemanId },
      'Ticket reclamado correctamente.',
    );
  }
}
