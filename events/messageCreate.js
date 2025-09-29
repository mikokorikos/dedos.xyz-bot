import { COMMAND_PREFIX } from '../config/constants.js';
import { withBranding } from '../utils/branding.js';
import { logger } from '../utils/logger.js';

export function createMessageHandler({ prefixCommands }) {
  return async function onMessage(message) {
    if (message.author.bot) return;
    if (!message.content.startsWith(COMMAND_PREFIX)) return;
    const [commandName] = message.content.trim().split(/\s+/);
    const commandKey = commandName.toLowerCase();
    const handler = prefixCommands.get(commandKey);
    if (!handler) {
      logger.debug('Comando de prefijo desconocido', {
        raw: message.content,
        commandKey,
        channelId: message.channel?.id ?? null,
        authorId: message.author?.id ?? null,
      });
      return;
    }
    logger.flow('Ejecutando comando de prefijo', {
      commandKey,
      channelId: message.channel?.id ?? null,
      authorId: message.author?.id ?? null,
    });
    try {
      await handler(message);
    } catch (error) {
      logger.error('Error ejecutando comando de prefijo', error);
      await message.reply(
        withBranding({ title: '❌ Error', description: 'Ocurrió un error al procesar tu comando.' })
      );
    }
  };
}
