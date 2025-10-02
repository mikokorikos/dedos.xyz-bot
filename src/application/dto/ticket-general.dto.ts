// =============================================================================
// RUTA: src/application/dto/ticket-general.dto.ts
// =============================================================================

import { z } from 'zod';

import { TicketType } from '@/domain/entities/types';

const SnowflakeSchema = z.string().regex(/^[0-9]{17,20}$/u, 'Invalid Discord snowflake');
const ContextSchema = z.string().min(10, 'Context must contain at least 10 characters').max(1000, 'Context must not exceed 1000 characters');

const buildGeneralTicketSchema = <TType extends TicketType>(type: TType) =>
  z.object({
    userId: SnowflakeSchema,
    guildId: SnowflakeSchema,
    type: z.literal(type),
    context: ContextSchema,
    partnerTag: z.string().regex(/^<@\d{17,20}>$/u, 'Invalid Discord mention').optional(),
  });

export const CreateBuyTicketSchema = buildGeneralTicketSchema(TicketType.BUY);
export const CreateSellTicketSchema = buildGeneralTicketSchema(TicketType.SELL);
export const CreateRobuxTicketSchema = buildGeneralTicketSchema(TicketType.ROBUX);
export const CreateNitroTicketSchema = buildGeneralTicketSchema(TicketType.NITRO);
export const CreateDecorTicketSchema = buildGeneralTicketSchema(TicketType.DECOR);

export type CreateBuyTicketDTO = z.infer<typeof CreateBuyTicketSchema>;
export type CreateSellTicketDTO = z.infer<typeof CreateSellTicketSchema>;
export type CreateRobuxTicketDTO = z.infer<typeof CreateRobuxTicketSchema>;
export type CreateNitroTicketDTO = z.infer<typeof CreateNitroTicketSchema>;
export type CreateDecorTicketDTO = z.infer<typeof CreateDecorTicketSchema>;

export const CreateGeneralTicketSchema = z.discriminatedUnion('type', [
  CreateBuyTicketSchema,
  CreateSellTicketSchema,
  CreateRobuxTicketSchema,
  CreateNitroTicketSchema,
  CreateDecorTicketSchema,
]);

export type CreateGeneralTicketDTO = z.infer<typeof CreateGeneralTicketSchema>;
