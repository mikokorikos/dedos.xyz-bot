import type { Message } from 'discord.js';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { handleMessageCreate } from '@/application/orchestrators/messageCreateOrchestrator';
import { messageGuards } from '@/shared/guards/message-guards';

vi.mock('@/shared/logger/pino', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

describe('handleMessageCreate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
    messageGuards.reset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  const createMessage = (overrides: Partial<Message> = {}): Message => {
    const reply = vi.fn().mockResolvedValue(undefined);

    return {
      author: { id: 'user-1', bot: false },
      content: '!ping',
      channelId: 'channel-1',
      guildId: 'guild-1',
      reply,
      ...overrides,
    } as unknown as Message;
  };

  it('ignores mensajes generados por bots', async () => {
    const message = createMessage({ author: { id: 'bot-user', bot: true } as never });

    await handleMessageCreate(message);

    expect(message.reply).not.toHaveBeenCalled();
  });

  it('ignora mensajes que no tienen prefijo válido', async () => {
    const message = createMessage({ content: 'hola mundo' });

    await handleMessageCreate(message);

    expect(message.reply).not.toHaveBeenCalled();
  });

  it('aplica cooldown y responde cuando corresponde', async () => {
    const first = createMessage();
    const second = createMessage();

    await handleMessageCreate(first);
    await handleMessageCreate(second);

    expect(second.reply).toHaveBeenCalledTimes(1);
    expect(second.reply).toHaveBeenCalledWith(expect.stringContaining('Debes esperar'));
  });

  it('bloquea mensajes repetidos considerados spam', async () => {
    const attempts = [createMessage(), createMessage(), createMessage(), createMessage()];

    await handleMessageCreate(attempts[0]);

    for (let index = 1; index < attempts.length; index += 1) {
      vi.setSystemTime(new Date(Date.now() + 3_100));
      await handleMessageCreate(attempts[index]);
    }

    const finalReply = attempts.at(-1)?.reply;
    expect(finalReply).toHaveBeenCalledWith(expect.stringContaining('anti-spam'));
  });
});
