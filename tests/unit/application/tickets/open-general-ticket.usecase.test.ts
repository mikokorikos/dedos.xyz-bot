import { describe, expect, it, beforeEach, vi } from 'vitest';

import { OpenGeneralTicketUseCase } from '@/application/usecases/tickets/OpenGeneralTicketUseCase';
import { Ticket } from '@/domain/entities/Ticket';
import { TicketStatus, TicketType } from '@/domain/entities/types';
import type { ITicketRepository } from '@/domain/repositories/ITicketRepository';
import type { ITicketParticipantRepository } from '@/domain/repositories/ITicketParticipantRepository';
import type { ITicketPolicyRepository } from '@/domain/repositories/ITicketPolicyRepository';
import { TicketCooldownError, TooManyOpenTicketsError } from '@/shared/errors/domain.errors';

const createGuildMock = () => {
  const send = vi.fn();
  const deleteChannel = vi.fn();

  const channel = {
    id: '123456789012345678',
    send,
    delete: deleteChannel,
  };

  const guild = {
    id: '987654321098765432',
    roles: { everyone: { id: 'everyone-role' } },
    members: { me: { id: 'bot-id' } },
    channels: {
      create: vi.fn().mockResolvedValue(channel),
    },
  } as any;

  return { guild, channel, send, deleteChannel };
};

const logger = {
  debug: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
} as any;

const prisma = {
  $transaction: vi.fn(async (callback: any) => callback({})),
} as any;

const createTicketRepo = () => {
  const repo: ITicketRepository = {
    withTransaction: vi.fn().mockReturnThis(),
    create: vi.fn(),
    findById: vi.fn(),
    findByChannelId: vi.fn(),
    findOpenByOwner: vi.fn(),
    findRecentByOwner: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    countOpenByOwner: vi.fn(),
    isParticipant: vi.fn(),
  };

  return repo;
};

const createPolicyRepo = () => {
  const repo: ITicketPolicyRepository = {
    withTransaction: vi.fn().mockReturnThis(),
    getSnapshot: vi.fn(),
  };

  return repo;
};

const createParticipantRepo = () => {
  const repo: ITicketParticipantRepository = {
    withTransaction: vi.fn().mockReturnThis(),
    addParticipant: vi.fn(),
    listByTicket: vi.fn(),
    isParticipant: vi.fn(),
  };

  return repo;
};

describe('OpenGeneralTicketUseCase', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-01T12:00:00.000Z'));
  });

  it('should prevent opening tickets when limit is reached', async () => {
    const ticketRepo = createTicketRepo();
    const policyRepo = createPolicyRepo();
    const participantRepo = createParticipantRepo();
    policyRepo.getSnapshot.mockResolvedValue({
      openCount: 3,
      lastOpenedAt: new Date('2024-06-01T10:00:00.000Z'),
      lastClosedAt: new Date('2024-06-01T11:00:00.000Z'),
    });

    const useCase = new OpenGeneralTicketUseCase(ticketRepo, policyRepo, participantRepo, prisma, logger);
    const { guild } = createGuildMock();

    await expect(
      useCase.execute(
        {
          userId: '111111111111111111',
          guildId: guild.id,
          type: TicketType.BUY,
          context: 'Quiero comprar un ítem de prueba',
        },
        guild,
      ),
    ).rejects.toBeInstanceOf(TooManyOpenTicketsError);
    expect(guild.channels.create).not.toHaveBeenCalled();
  });

  it('should enforce cooldown based on last open ticket', async () => {
    const ticketRepo = createTicketRepo();
    const policyRepo = createPolicyRepo();
    const participantRepo = createParticipantRepo();
    policyRepo.getSnapshot.mockResolvedValue({
      openCount: 0,
      lastOpenedAt: new Date('2024-06-01T11:45:00.000Z'),
      lastClosedAt: new Date('2024-06-01T11:50:00.000Z'),
    });

    const useCase = new OpenGeneralTicketUseCase(ticketRepo, policyRepo, participantRepo, prisma, logger);
    const { guild } = createGuildMock();

    await expect(
      useCase.execute(
        {
          userId: '111111111111111111',
          guildId: guild.id,
          type: TicketType.BUY,
          context: 'Solicitud dentro de cooldown',
        },
        guild,
      ),
    ).rejects.toBeInstanceOf(TicketCooldownError);
  });

  it('should create ticket and register participants when allowed', async () => {
    const ticketRepo = createTicketRepo();
    const policyRepo = createPolicyRepo();
    const participantRepo = createParticipantRepo();
    policyRepo.getSnapshot.mockResolvedValue({
      openCount: 0,
      lastOpenedAt: new Date('2024-05-31T12:00:00.000Z'),
      lastClosedAt: new Date('2024-05-31T13:00:00.000Z'),
    });

    const ticket = new Ticket(
      25,
      999n,
      555n,
      111n,
      TicketType.SELL,
      TicketStatus.OPEN,
      new Date('2024-06-01T12:00:00.000Z'),
    );

    ticketRepo.create.mockResolvedValue(ticket);

    const useCase = new OpenGeneralTicketUseCase(ticketRepo, policyRepo, participantRepo, prisma, logger);
    const { guild, channel } = createGuildMock();

    const result = await useCase.execute(
      {
        userId: '111111111111111111',
        guildId: guild.id,
        type: TicketType.SELL,
        context: 'Descripción detallada del ticket',
      },
      guild,
    );

    expect(result.ticket).toBe(ticket);
    expect(result.channel).toEqual(channel);
    expect(ticketRepo.create).toHaveBeenCalled();
    expect(participantRepo.addParticipant).toHaveBeenCalledWith({
      ticketId: ticket.id,
      userId: 111111111111111111n,
      role: 'OWNER',
    });
    expect(channel.send).toHaveBeenCalled();
  });
});
