// ============================================================================
// RUTA: src/domain/entities/Warn.ts
// ============================================================================

import { WarnSeverity } from '@/domain/entities/types';

export class Warn {
  public constructor(
    public readonly id: number,
    public readonly userId: bigint,
    public readonly moderatorId: bigint | null,
    public readonly severity: WarnSeverity,
    public readonly reason: string | null,
    public readonly createdAt: Date,
  ) {}

  public isCritical(): boolean {
    return this.severity === WarnSeverity.CRITICAL;
  }

  public weight(): number {
    switch (this.severity) {
      case WarnSeverity.MINOR:
        return 1;
      case WarnSeverity.MAJOR:
        return 2;
      case WarnSeverity.CRITICAL:
        return 3;
      default:
        return 1;
    }
  }
}
