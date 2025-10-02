import type { Message, PartialMessage } from 'discord.js';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { handleMessageDelete } from '@/application/orchestrators/messageDeleteOrchestrator';

vi.mock('@/shared/logger/pino', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

const createMessage = (overrides: Partial<Message | PartialMessage> = {}) => ({
  id: 'message-1',
  channelId: 'channel-1',
  guildId: 'guild-1',
  partial: false,
  attachments: { size: 0 },
  ...overrides,
}) as Message | PartialMessage;

describe('handleMessageDelete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('advierte cuando el mensaje es parcial', async () => {
    const message = createMessage({ partial: true });

    await handleMessageDelete(message);

    const { logger } = await import('@/shared/logger/pino');
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ messageId: 'message-1' }),
      'Se eliminó un mensaje parcial (sin contenido en caché).',
    );
  });

  it('registra la eliminación de mensajes completos', async () => {
    const message = createMessage({ author: { id: 'user-1' } as never });

    await handleMessageDelete(message);

    const { logger } = await import('@/shared/logger/pino');
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ authorId: 'user-1', hadAttachments: false }),
      'Mensaje eliminado registrado.',
    );
  });
});
