// ============================================================================
// RUTA: src/application/dto/ticket.dto.ts
// ============================================================================

import { z } from 'zod';

import { TicketType } from '@/domain/entities/types';
import { SnowflakeSchema } from '@/shared/utils/validation';

export const CreateMiddlemanTicketSchema = z.object({
  userId: SnowflakeSchema,
  guildId: SnowflakeSchema,
  type: z.literal(TicketType.MM),
  context: z.string().min(10).max(1000, 'El contexto debe tener entre 10 y 1000 caracteres.'),
  partnerTag: SnowflakeSchema.optional(),
  robloxUsername: z.string().min(3).max(50).optional(),
});

export type CreateMiddlemanTicketDTO = z.infer<typeof CreateMiddlemanTicketSchema>;

export const ClaimTicketSchema = z.object({
  ticketId: z.number().int().positive(),
  middlemanId: SnowflakeSchema,
});

export type ClaimTicketDTO = z.infer<typeof ClaimTicketSchema>;

export const GeneralTicketReasonSchema = z
  .string()
  .min(10, 'Describe el motivo del ticket con al menos 10 caracteres.')
  .max(1000, 'El motivo no puede exceder los 1000 caracteres.');

export const CreateGeneralTicketSchema = z.object({
  userId: SnowflakeSchema,
  guildId: SnowflakeSchema,
  type: z.nativeEnum(TicketType).refine((value) => value !== TicketType.MM, {
    message: 'Los tickets generales no pueden ser de tipo middleman.',
  }),
  reason: GeneralTicketReasonSchema,
});

export type CreateGeneralTicketDTO = z.infer<typeof CreateGeneralTicketSchema>;

export const CloseTicketSchema = z.object({
  ticketId: z.number().int().positive(),
  executorId: SnowflakeSchema,
});

export type CloseTicketDTO = z.infer<typeof CloseTicketSchema>;
