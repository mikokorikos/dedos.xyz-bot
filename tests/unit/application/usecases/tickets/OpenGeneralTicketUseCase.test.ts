import type { PrismaClient } from '@prisma/client';
import type { Guild, TextChannel } from 'discord.js';
import type { Logger } from 'pino';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type CreateGeneralTicketDTO } from '@/application/dto/ticket.dto';
import { OpenGeneralTicketUseCase } from '@/application/usecases/tickets/OpenGeneralTicketUseCase';
import { Ticket } from '@/domain/entities/Ticket';
import { TicketStatus, TicketType } from '@/domain/entities/types';
import type {
  ITicketParticipantRepository,
  TicketParticipantRecord,
} from '@/domain/repositories/ITicketParticipantRepository';
import type {
  CreateTicketData,
  FindTicketsByOwnerOptions,
  ITicketRepository,
  TicketParticipantInput,
} from '@/domain/repositories/ITicketRepository';
import type {
  ITicketTypePolicyRepository,
  TicketTypeCooldown,
  TicketTypePolicy,
} from '@/domain/repositories/ITicketTypePolicyRepository';
import { TicketCooldownActiveError, TooManyOpenTicketsError } from '@/shared/errors/domain.errors';
import { embedFactory } from '@/presentation/embeds/EmbedFactory';

class MockPrismaClient {
  public $transaction = vi.fn(async (callback: (tx: unknown) => Promise<Ticket>) => callback({}));
}

class MockTicketRepository implements ITicketRepository {
  public createdTickets: CreateTicketData[] = [];
  public openTickets = 0;

  public withTransaction(): ITicketRepository {
    return this;
  }

  public async create(data: CreateTicketData): Promise<Ticket> {
    this.createdTickets.push(data);
    return new Ticket(1, data.guildId, data.channelId, data.ownerId, data.type, TicketStatus.OPEN, new Date());
  }

  public async findById(): Promise<Ticket | null> {
    return null;
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

  public async update(): Promise<void> {}

  public async delete(): Promise<void> {}

  public async countOpenByOwner(_ownerId: bigint): Promise<number> {
    return this.openTickets;
  }

  public async countOpenByOwnerAndType(_ownerId: bigint, _type: TicketType): Promise<number> {
    return this.openTickets;
  }

  public async isParticipant(): Promise<boolean> {
    return false;
  }
}

class MockParticipantRepository implements ITicketParticipantRepository {
  public added: ReadonlyArray<TicketParticipantInput> = [];

  public withTransaction(): ITicketParticipantRepository {
    return this;
  }

  public async addMany(_ticketId: number, participants: ReadonlyArray<TicketParticipantInput>): Promise<void> {
    this.added = participants;
  }

  public async remove(): Promise<void> {}

  public async list(): Promise<readonly TicketParticipantRecord[]> {
    return this.added.map((participant) => ({
      ticketId: 1,
      userId: participant.userId,
      role: participant.role ?? null,
      joinedAt: participant.joinedAt ?? new Date(),
    }));
  }

  public async isParticipant(): Promise<boolean> {
    return true;
  }
}

class MockPolicyRepository implements ITicketTypePolicyRepository {
  public policy: TicketTypePolicy = {
    type: TicketType.BUY,
    maxOpenPerUser: 2,
    cooldownSeconds: 60,
    requiresStaffApproval: false,
  };
  public cooldown: TicketTypeCooldown | null = null;

  public withTransaction(): ITicketTypePolicyRepository {
    return this;
  }

  public async getPolicy(): Promise<TicketTypePolicy | null> {
    return this.policy;
  }

  public async getAllPolicies(): Promise<readonly TicketTypePolicy[]> {
    return [this.policy];
  }

  public async getCooldown(): Promise<TicketTypeCooldown | null> {
    return this.cooldown;
  }

  public async upsertCooldown(): Promise<void> {}
}

const createLogger = (): Logger =>
  ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    trace: vi.fn(),
    child: vi.fn().mockReturnThis(),
    level: 'silent',
  } as unknown as Logger);

const createGuild = (channel: TextChannel): Guild =>
  ({
    id: '123',
    members: { me: { id: 'bot' } },
    roles: { everyone: { id: 'everyone' } },
    channels: { create: vi.fn().mockResolvedValue(channel) },
  } as unknown as Guild);

describe('OpenGeneralTicketUseCase', () => {
  let prisma: MockPrismaClient;
  let repo: MockTicketRepository;
  let participantRepo: MockParticipantRepository;
  let policyRepo: MockPolicyRepository;
  let logger: Logger;
  let channel: TextChannel & { send: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> };
  let guild: Guild;
  let useCase: OpenGeneralTicketUseCase;

  beforeEach(() => {
    prisma = new MockPrismaClient();
    repo = new MockTicketRepository();
    participantRepo = new MockParticipantRepository();
    policyRepo = new MockPolicyRepository();
    logger = createLogger();
    channel = {
      id: '999',
      send: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      permissionOverwrites: { edit: vi.fn().mockResolvedValue(undefined) },
    } as unknown as TextChannel & { send: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> };
    guild = createGuild(channel);
    useCase = new OpenGeneralTicketUseCase(
      prisma as unknown as PrismaClient,
      repo,
      participantRepo,
      policyRepo,
      logger,
      embedFactory,
    );
  });

  it('crea ticket y canal con éxito', async () => {
    const dto: CreateGeneralTicketDTO = {
      type: 'BUY',
      userId: '123456789012345678',
      guildId: '987654321098765432',
      context: {
        item: 'Limited UGC',
        notes: 'Busco el item a precio competitivo',
      },
    };

    const result = await useCase.execute(dto, guild);

    expect(result.ticket.id).toBe(1);
    expect(result.channel).toBe(channel);
    expect(repo.createdTickets).toHaveLength(1);
    expect(channel.send).toHaveBeenCalled();
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('lanza error cuando el usuario alcanza el límite', async () => {
    repo.openTickets = 2;

    await expect(
      useCase.execute(
        {
          type: 'BUY',
          userId: '123456789012345678',
          guildId: '987654321098765432',
          context: {
            item: 'Limited',
            notes: 'Necesito comprar ahora mismo',
          },
        },
        guild,
      ),
    ).rejects.toBeInstanceOf(TooManyOpenTicketsError);
  });

  it('lanza error si existe un cooldown activo', async () => {
    policyRepo.cooldown = {
      type: TicketType.BUY,
      userId: 123456789012345678n,
      lastOpenedAt: new Date(),
    };

    await expect(
      useCase.execute(
        {
          type: 'BUY',
          userId: '123456789012345678',
          guildId: '987654321098765432',
          context: {
            item: 'Limited',
            notes: 'Intento abrir otro ticket demasiado pronto',
          },
        },
        guild,
      ),
    ).rejects.toBeInstanceOf(TicketCooldownActiveError);
  });
});
