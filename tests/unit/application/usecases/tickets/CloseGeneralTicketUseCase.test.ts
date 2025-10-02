import { describe, expect, it, vi } from 'vitest';

import { CloseGeneralTicketUseCase } from '@/application/usecases/tickets/CloseGeneralTicketUseCase';
import { Ticket } from '@/domain/entities/Ticket';
import { TicketStatus, TicketType } from '@/domain/entities/types';
import type { ITicketParticipantRepository } from '@/domain/repositories/ITicketParticipantRepository';
import type { FindTicketsByOwnerOptions, ITicketRepository } from '@/domain/repositories/ITicketRepository';
import {
  TicketParticipantNotFoundError,
  TicketNotFoundError,
} from '@/shared/errors/domain.errors';
import type { Logger } from '@/shared/logger/pino';

class MockTicketRepository implements ITicketRepository {
  public ticket: Ticket | null = new Ticket(
    1,
    111111111111111111n,
    222222222222222222n,
    333333333333333333n,
    TicketType.BUY,
    TicketStatus.OPEN,
    new Date(),
  );
  public update = vi.fn(async (ticket: Ticket) => {
    this.ticket = ticket;
  });

  public withTransaction(): ITicketRepository {
    return this;
  }

  public async create(): Promise<Ticket> {
    throw new Error('Not implemented');
  }

  public async findById(id: number): Promise<Ticket | null> {
    return this.ticket && this.ticket.id === id ? this.ticket : null;
  }

  public async findByChannelId(): Promise<Ticket | null> {
    return null;
  }

  public async findOpenByOwner(): Promise<readonly Ticket[]> {
    return [];
  }

  public async findByOwner(_ownerId: bigint, _options?: FindTicketsByOwnerOptions): Promise<readonly Ticket[]> {
    return [];
  }

  public async delete(): Promise<void> {}

  public async countOpenByOwner(_ownerId: bigint): Promise<number> {
    return 0;
  }

  public async countOpenByOwnerAndType(_ownerId: bigint, _type: TicketType): Promise<number> {
    return 0;
  }

  public async isParticipant(): Promise<boolean> {
    return true;
  }
}

class MockParticipantRepository implements ITicketParticipantRepository {
  public withTransaction(): ITicketParticipantRepository {
    return this;
  }

  public async addMany(): Promise<void> {}

  public async remove(): Promise<void> {}

  public async list(): Promise<readonly never[]> {
    return [];
  }

  public isParticipant = vi.fn<[], Promise<boolean>>().mockResolvedValue(true);
}

const logger: Logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  fatal: vi.fn(),
  trace: vi.fn(),
  child: vi.fn().mockReturnThis(),
  level: 'silent',
} as unknown as Logger;

describe('CloseGeneralTicketUseCase', () => {
  it('cierra el ticket cuando el usuario participa', async () => {
    const repo = new MockTicketRepository();
    const participants = new MockParticipantRepository();
    const useCase = new CloseGeneralTicketUseCase(repo, participants, logger);

    await useCase.execute({ ticketId: 1, executorId: '333333333333333333', reason: 'Listo' });

    expect(repo.ticket?.isClosed()).toBe(true);
    expect(repo.update).toHaveBeenCalled();
  });

  it('lanza error cuando el ticket no existe', async () => {
    const repo = new MockTicketRepository();
    repo.ticket = null;
    const participants = new MockParticipantRepository();
    const useCase = new CloseGeneralTicketUseCase(repo, participants, logger);

    await expect(useCase.execute({ ticketId: 999, executorId: '111111111111111111' })).rejects.toBeInstanceOf(
      TicketNotFoundError,
    );
  });

  it('requiere participación cuando no hay override', async () => {
    const repo = new MockTicketRepository();
    const participants = new MockParticipantRepository();
    participants.isParticipant.mockResolvedValue(false);
    const useCase = new CloseGeneralTicketUseCase(repo, participants, logger);

    await expect(useCase.execute({ ticketId: 1, executorId: '444444444444444444' })).rejects.toBeInstanceOf(
      TicketParticipantNotFoundError,
    );
  });

  it('cierra el ticket con override aunque no participe', async () => {
    const repo = new MockTicketRepository();
    const participants = new MockParticipantRepository();
    participants.isParticipant.mockResolvedValue(false);
    const useCase = new CloseGeneralTicketUseCase(repo, participants, logger);

    await useCase.execute({ ticketId: 1, executorId: '444444444444444444', allowStaffOverride: true });

    expect(repo.ticket?.isClosed()).toBe(true);
  });
});
