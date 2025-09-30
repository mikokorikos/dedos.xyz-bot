// ============================================================================
// RUTA: src/application/dto/trade.dto.ts
// ============================================================================

import { z } from 'zod';

import { SnowflakeSchema } from '@/shared/utils/validation';

export const TradeItemSchema = z.object({
  name: z.string().min(1).max(64),
  quantity: z.number().int().min(1).max(10_000),
  metadata: z.record(z.unknown()).optional(),
});

export const TradeParticipantSchema = z.object({
  userId: SnowflakeSchema,
  robloxUsername: z.string().min(3).max(50),
  robloxUserId: z
    .string()
    .regex(/^\d+$/u)
    .transform((value) => BigInt(value))
    .optional(),
  items: z.array(TradeItemSchema).max(25).optional(),
});

export type TradeItemDTO = z.infer<typeof TradeItemSchema>;
export type TradeParticipantDTO = z.infer<typeof TradeParticipantSchema>;
