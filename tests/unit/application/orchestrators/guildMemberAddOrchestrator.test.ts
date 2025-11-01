import type { GuildMember } from 'discord.js';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { handleGuildMemberAdd } from '@/application/orchestrators/guildMemberAddOrchestrator';

vi.mock('@/shared/logger/pino', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

const createMember = (overrides: Partial<GuildMember> = {}): GuildMember =>
  ({
    id: 'user-1',
    guild: { id: 'guild-1' },
    joinedTimestamp: 1_700_000_000_000,
    ...overrides,
  } as unknown as GuildMember);

describe('handleGuildMemberAdd', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registra la llegada de un nuevo miembro', async () => {
    const member = createMember();

    await handleGuildMemberAdd(member);

    const { logger } = await import('@/shared/logger/pino');
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', guildId: 'guild-1' }),
      'Nuevo miembro detectado en el servidor.',
    );
  });
});
