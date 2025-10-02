import { describe, expect, it, vi } from 'vitest';

vi.mock('discord.js', () => ({
  Events: { MessageCreate: 'messageCreate' },
}));

const executeMock = vi.fn();

vi.mock('@/application/orchestrators/messageCreateOrchestrator', () => ({
  handleMessageCreate: executeMock,
}));

describe('messageCreateEvent descriptor', () => {
  it('delegates execution al orquestador', async () => {
    const { messageCreateEvent } = await import('@/presentation/events/messageCreate');

    await messageCreateEvent.execute({} as never);

    expect(executeMock).toHaveBeenCalledTimes(1);
  });
});
