// ============================================================================
// RUTA: src/domain/entities/types.ts
// ============================================================================

export enum TicketType {
  BUY = 'BUY',
  SELL = 'SELL',
  ROBUX = 'ROBUX',
  NITRO = 'NITRO',
  DECOR = 'DECOR',
  MM = 'MM',
}

export enum TicketStatus {
  OPEN = 'OPEN',
  CONFIRMED = 'CONFIRMED',
  CLAIMED = 'CLAIMED',
  CLOSED = 'CLOSED',
}

export enum WarnSeverity {
  MINOR = 'MINOR',
  MAJOR = 'MAJOR',
  CRITICAL = 'CRITICAL',
}

export interface TradeItem {
  readonly id?: number;
  readonly name: string;
  readonly quantity: number;
  readonly metadata?: Record<string, unknown> | null;
}

export interface TicketCategoryConfig {
  readonly type: TicketType;
  readonly label: string;
  readonly description: string;
}
