// ============================================================================
// RUTA: src/domain/entities/Trade.ts
// ============================================================================

import type { TradeItem } from '@/domain/entities/types';
import { TradeStatus, TradeStatusVO } from '@/domain/value-objects/TradeStatus';
import {
  InvalidTradeParticipantError,
  InvalidTradeStateError,
} from '@/shared/errors/domain.errors';

export interface TradeParticipantFinalization {
  readonly userId: bigint;
  readonly confirmedAt: Date;
}

export class Trade {
  public readonly items: TradeItem[];
  private readonly participantFinalizations: Map<bigint, Date>;

  public constructor(
    public readonly id: number,
    public readonly ticketId: number,
    public readonly userId: bigint,
    public readonly robloxUsername: string,
    public robloxUserId: bigint | null,
    public status: TradeStatus,
    public confirmed: boolean,
    items: TradeItem[],
    finalizations: ReadonlyArray<TradeParticipantFinalization>,
    public readonly createdAt: Date,
  ) {
    this.items = [...items];
    this.participantFinalizations = new Map(
      finalizations.map((finalization) => [finalization.userId, finalization.confirmedAt]),
    );
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

  public attachItems(items: ReadonlyArray<TradeItem>): void {
    if (this.status === TradeStatus.CANCELLED) {
      throw new InvalidTradeStateError(this.status, this.status);
    }

    this.items.splice(0, this.items.length, ...items);
  }

  public canBeCompleted(): boolean {
    return this.confirmed && this.status === TradeStatus.ACTIVE;
  }

  public getStatus(): TradeStatus {
    return this.status;
  }

  public listParticipantFinalizations(): ReadonlyArray<TradeParticipantFinalization> {
    return Array.from(this.participantFinalizations.entries()).map(([userId, confirmedAt]) => ({
      userId,
      confirmedAt,
    }));
  }

  public isParticipantConfirmed(userId: bigint): boolean {
    return this.participantFinalizations.has(userId);
  }

  public confirmParticipant(userId: bigint, confirmedAt: Date = new Date()): void {
    if (this.status === TradeStatus.CANCELLED) {
      throw new InvalidTradeStateError(this.status, TradeStatus.ACTIVE);
    }

    this.participantFinalizations.set(userId, confirmedAt);
  }

  public cancelParticipant(userId: bigint): void {
    if (!this.participantFinalizations.has(userId)) {
      throw new InvalidTradeParticipantError(String(userId));
    }

    this.participantFinalizations.delete(userId);
  }
}
