import { describe, expect, it, vi } from 'vitest';

vi.mock('discord.js', () => ({
  Events: { MessageDelete: 'messageDelete' },
}));

const handleMock = vi.fn();

vi.mock('@/application/orchestrators/messageDeleteOrchestrator', () => ({
  handleMessageDelete: handleMock,
}));

describe('messageDeleteEvent descriptor', () => {
  it('delegates la eliminación al orquestador', async () => {
    const { messageDeleteEvent } = await import('@/presentation/events/messageDelete');

    const message = { id: 'message' } as never;

    await messageDeleteEvent.execute(message);

    expect(handleMock).toHaveBeenCalledWith(message);
  });
});
