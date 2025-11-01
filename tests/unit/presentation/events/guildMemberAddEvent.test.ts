import { describe, expect, it, vi } from 'vitest';

vi.mock('discord.js', () => ({
  Events: { GuildMemberAdd: 'guildMemberAdd' },
}));

const handleMock = vi.fn();

vi.mock('@/application/orchestrators/guildMemberAddOrchestrator', () => ({
  handleGuildMemberAdd: handleMock,
}));

describe('guildMemberAddEvent descriptor', () => {
  it('invoca al orquestador correspondiente', async () => {
    const { guildMemberAddEvent } = await import('@/presentation/events/guildMemberAdd');

    await guildMemberAddEvent.execute({} as never);

    expect(handleMock).toHaveBeenCalledTimes(1);
  });
});
