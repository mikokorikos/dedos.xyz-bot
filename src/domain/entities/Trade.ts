// ============================================================================
// RUTA: src/domain/entities/Trade.ts
// ============================================================================

import type { TradeItem } from '@/domain/entities/types';
import { TradeStatus, TradeStatusVO } from '@/domain/value-objects/TradeStatus';
import { InvalidTradeStateError } from '@/shared/errors/domain.errors';

export class Trade {
  public readonly items: TradeItem[];

  public constructor(
    public readonly id: number,
    public readonly ticketId: number,
    public readonly userId: bigint,
    public readonly robloxUsername: string,
    public robloxUserId: bigint | null,
    public status: TradeStatus,
    public confirmed: boolean,
    items: TradeItem[],
    public readonly createdAt: Date,
  ) {
    this.items = [...items];
  }

  public confirm(): void {
    if (this.status === TradeStatus.CANCELLED || this.status === TradeStatus.COMPLETED) {
      throw new InvalidTradeStateError(this.status, TradeStatus.ACTIVE);
    }

    this.confirmed = true;
    if (this.status === TradeStatus.PENDING) {
      this.status = TradeStatus.ACTIVE;
    }
  }

  public complete(): void {
    if (!this.canBeCompleted()) {
      throw new InvalidTradeStateError(this.status, TradeStatus.COMPLETED);
    }

    if (!TradeStatusVO.canTransitionTo(this.status, TradeStatus.COMPLETED)) {
      throw new InvalidTradeStateError(this.status, TradeStatus.COMPLETED);
    }

    this.status = TradeStatus.COMPLETED;
  }

  public cancel(): void {
    if (this.status === TradeStatus.COMPLETED) {
      throw new InvalidTradeStateError(this.status, TradeStatus.CANCELLED);
    }

    this.status = TradeStatus.CANCELLED;
  }

  public addItem(item: TradeItem): void {
    if (this.status === TradeStatus.CANCELLED) {
      throw new InvalidTradeStateError(this.status, this.status);
    }

    this.items.push(item);
  }

  public canBeCompleted(): boolean {
    return this.confirmed && this.status === TradeStatus.ACTIVE;
  }
}
