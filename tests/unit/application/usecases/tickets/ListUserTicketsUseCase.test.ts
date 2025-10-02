import { describe, expect, it } from 'vitest';

import { ListUserTicketsUseCase } from '@/application/usecases/tickets/ListUserTicketsUseCase';
import { Ticket } from '@/domain/entities/Ticket';
import { TicketStatus, TicketType } from '@/domain/entities/types';
import type { CreateTicketData, FindTicketsByOwnerOptions, ITicketRepository } from '@/domain/repositories/ITicketRepository';

class MockTicketRepository implements ITicketRepository {
  public tickets: Ticket[] = [
    new Ticket(
      1,
      111111111111111111n,
      222222222222222222n,
      333333333333333333n,
      TicketType.BUY,
      TicketStatus.OPEN,
      new Date(),
    ),
    new Ticket(
      2,
      111111111111111111n,
      333333333333333333n,
      333333333333333333n,
      TicketType.MM,
      TicketStatus.CLAIMED,
      new Date(),
    ),
  ];
  public options: FindTicketsByOwnerOptions | undefined;

  public withTransaction(): ITicketRepository {
    return this;
  }

  public async create(): Promise<Ticket> {
    throw new Error('Not implemented');
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

  public async findByOwner(_ownerId: bigint, options?: FindTicketsByOwnerOptions): Promise<readonly Ticket[]> {
    this.options = options;
    return this.tickets;
  }

  public async update(): Promise<void> {}

  public async delete(): Promise<void> {}

  public async countOpenByOwner(_ownerId: bigint): Promise<number> {
    return 0;
  }

  public async countOpenByOwnerAndType(_ownerId: bigint, _type: TicketType): Promise<number> {
    return 0;
  }

  public async isParticipant(): Promise<boolean> {
    return false;
  }
}

describe('ListUserTicketsUseCase', () => {
  it('filtra tickets no middleman y aplica estados abiertos por defecto', async () => {
    const repo = new MockTicketRepository();
    const useCase = new ListUserTicketsUseCase(repo);

    const tickets = await useCase.execute({
      userId: '333333333333333333',
      guildId: '111111111111111111',
      includeClosed: false,
      limit: 5,
    });

    expect(tickets).toHaveLength(1);
    expect(tickets[0].type).toBe(TicketType.BUY);
    expect(repo.options?.statuses).toEqual([TicketStatus.OPEN, TicketStatus.CONFIRMED, TicketStatus.CLAIMED]);
    expect(repo.options?.limit).toBe(5);
  });

  it('cuando incluye cerrados no filtra estados', async () => {
    const repo = new MockTicketRepository();
    const useCase = new ListUserTicketsUseCase(repo);

    await useCase.execute({
      userId: '333333333333333333',
      guildId: '111111111111111111',
      includeClosed: true,
    });

    expect(repo.options?.statuses).toBeUndefined();
  });
});
