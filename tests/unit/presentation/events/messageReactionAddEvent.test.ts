import { describe, expect, it, vi } from 'vitest';

vi.mock('discord.js', () => ({
  Events: { MessageReactionAdd: 'messageReactionAdd' },
}));

const handleMock = vi.fn();

vi.mock('@/application/orchestrators/messageReactionAddOrchestrator', () => ({
  handleMessageReactionAdd: handleMock,
}));

describe('messageReactionAddEvent descriptor', () => {
  it('envía los parámetros a su orquestador', async () => {
    const { messageReactionAddEvent } = await import('@/presentation/events/messageReactionAdd');

    const reaction = { id: 'reaction' } as never;
    const user = { id: 'user' } as never;

    await messageReactionAddEvent.execute(reaction, user);

    expect(handleMock).toHaveBeenCalledWith(reaction, user);
  });
});
