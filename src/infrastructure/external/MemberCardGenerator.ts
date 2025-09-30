// ============================================================================
// RUTA: src/infrastructure/external/MemberCardGenerator.ts
// ============================================================================

import type { MemberTradeStats } from '@/domain/entities/MemberTradeStats';

/**
 * Generador simplificado de tarjetas de miembros. En una implementación real podríamos usar
 * node-canvas o un microservicio especializado. Por ahora devolvemos `null` para forzar el
 * uso de embeds hasta que la versión final incorpore la imagen renderizada.
 */
export class MemberCardGenerator {
  // eslint-disable-next-line class-methods-use-this
  public async render(_stats: MemberTradeStats): Promise<Buffer | null> {
    return null;
  }
}

export const memberCardGenerator = new MemberCardGenerator();
