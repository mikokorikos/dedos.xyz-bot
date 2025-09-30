// ============================================================================
// RUTA: src/application/dto/review.dto.ts
// ============================================================================

import { z } from 'zod';

import { SnowflakeSchema } from '@/shared/utils/validation';

export const SubmitReviewSchema = z.object({
  ticketId: z.number().int().positive(),
  reviewerId: SnowflakeSchema,
  middlemanId: SnowflakeSchema,
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

export type SubmitReviewDTO = z.infer<typeof SubmitReviewSchema>;
