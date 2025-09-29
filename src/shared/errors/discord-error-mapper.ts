import type { InteractionReplyOptions } from 'discord.js';

import type { AppError } from '@/shared/errors/base.error';
import { isAppError } from '@/shared/errors/base.error';

const GENERIC_MESSAGE = 'Ha ocurrido un error inesperado. El equipo ha sido notificado.';

type DiscordErrorResponse = InteractionReplyOptions & { readonly shouldLogStack?: boolean };

export const mapErrorToDiscordResponse = (error: unknown): DiscordErrorResponse => {
  if (isAppError(error)) {
    return {
      content: error.exposeMessage ? error.message : GENERIC_MESSAGE,
      ephemeral: true,
      shouldLogStack: error.statusCode >= 500,
    };
  }

  const unknownError = error as Partial<AppError> | undefined;
  const content = typeof unknownError?.message === 'string' ? unknownError.message : GENERIC_MESSAGE;

  return {
    content,
    ephemeral: true,
    shouldLogStack: true,
  };
};
