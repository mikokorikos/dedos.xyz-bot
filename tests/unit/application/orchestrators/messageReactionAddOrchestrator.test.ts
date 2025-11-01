import type { MessageReaction, PartialMessageReaction, PartialUser, User } from 'discord.js';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { handleMessageReactionAdd } from '@/application/orchestrators/messageReactionAddOrchestrator';

vi.mock('@/shared/logger/pino', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const createReaction = (overrides: Partial<MessageReaction | PartialMessageReaction> = {}) => ({
  emoji: { id: null, name: '🔥' },
  message: { id: 'message-1', channelId: 'channel-1' },
  ...overrides,
}) as MessageReaction | PartialMessageReaction;

const createUser = (overrides: Partial<User | PartialUser> = {}) => ({
  id: 'user-1',
  bot: false,
  ...overrides,
}) as User | PartialUser;

describe('handleMessageReactionAdd', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ignora reacciones generadas por bots', async () => {
    const reaction = createReaction();
    const user = createUser({ bot: true });

    await handleMessageReactionAdd(reaction, user);

    const { logger } = await import('@/shared/logger/pino');
    expect(logger.debug).not.toHaveBeenCalled();
  });

  it('registra reacciones válidas', async () => {
    const reaction = createReaction();
    const user = createUser();

    await handleMessageReactionAdd(reaction, user);

    const { logger } = await import('@/shared/logger/pino');
    expect(logger.debug).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', emoji: '🔥' }),
      'Reacción registrada correctamente.',
    );
  });
});
