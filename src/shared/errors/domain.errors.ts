// ============================================================================
// RUTA: src/shared/errors/domain.errors.ts
// ============================================================================

import { DedosError } from '@/shared/errors/base.error';

export class TicketNotFoundError extends DedosError {
  public constructor(ticketId: string) {
    super({
      code: 'TICKET_NOT_FOUND',
      message: `No se encontró el ticket con identificador ${ticketId}.`,
      metadata: { ticketId },
      exposeMessage: true,
    });
  }
}

export class UnauthorizedActionError extends DedosError {
  public constructor(action: string) {
    super({
      code: 'UNAUTHORIZED_ACTION',
      message: 'No tienes permisos para realizar esta acción.',
      metadata: { action },
      exposeMessage: true,
    });
  }
}

export class InvalidRatingError extends DedosError {
  public constructor(rating: number) {
    super({
      code: 'INVALID_RATING',
      message: 'La valoración debe estar entre 1 y 5 estrellas.',
      metadata: { rating },
      exposeMessage: true,
    });
  }
}

export class MiddlemanNotFoundError extends DedosError {
  public constructor(userId: string) {
    super({
      code: 'MIDDLEMAN_NOT_FOUND',
      message: 'El middleman solicitado no está disponible.',
      metadata: { userId },
      exposeMessage: true,
    });
  }
}

export class TradeLimitExceededError extends DedosError {
  public constructor(limit: number) {
    super({
      code: 'TRADE_LIMIT_EXCEEDED',
      message: 'Has alcanzado el límite de transacciones simultáneas.',
      metadata: { limit },
      exposeMessage: true,
    });
  }
}

export class DuplicateReviewError extends DedosError {
  public constructor(ticketId: string, authorId: string) {
    super({
      code: 'DUPLICATE_REVIEW',
      message: 'Ya has enviado una reseña para este ticket.',
      metadata: { ticketId, authorId },
      exposeMessage: true,
    });
  }
}

export class DiscordEntityCreationError extends DedosError {
  public constructor(entity: string, cause?: unknown) {
    super({
      code: 'DISCORD_ENTITY_CREATION_FAILED',
      message: `No se pudo crear ${entity} en Discord.`,
      metadata: { entity },
      exposeMessage: true,
      cause,
    });
  }
}

export class DatabaseUnavailableError extends DedosError {
  public constructor(message = 'La base de datos no está disponible en este momento.') {
    super({
      code: 'DATABASE_UNAVAILABLE',
      message,
      exposeMessage: false,
    });
  }
}

export class ValidationFailedError extends DedosError {
  public constructor(details: Record<string, unknown>) {
    super({
      code: 'VALIDATION_FAILED',
      message: 'Los datos proporcionados no son válidos.',
      metadata: details,
      exposeMessage: true,
    });
  }
}
