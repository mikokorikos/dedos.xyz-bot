// ============================================================================
// RUTA: src/application/dto/ticket.dto.ts
// ============================================================================

import { z } from 'zod';

const DiscordSnowflakeSchema = z
  .string()
  .trim()
  .regex(/^\d{17,20}$/u, 'Invalid Discord ID');

const GuildSnowflakeSchema = DiscordSnowflakeSchema.describe('Discord guild snowflake');

const PositiveIntegerSchema = z
  .coerce
  .number()
  .int('Value must be a positive integer')
  .positive('Value must be a positive integer');

const TrimmedString = z.string().trim();

const RichDescriptionSchema = TrimmedString.min(20, 'Context must include at least 20 characters.').max(
  1_000,
  'Context must be at most 1000 characters.',
);

const ShortLabelSchema = TrimmedString.min(3, 'Provide a longer description.').max(80, 'Label is too long.');

export const GeneralTicketTypeSchema = z.enum(['BUY', 'SELL', 'ROBUX', 'NITRO', 'DECOR']);
export type GeneralTicketType = z.infer<typeof GeneralTicketTypeSchema>;

const BaseGeneralTicketSchema = z.object({
  userId: DiscordSnowflakeSchema,
  guildId: GuildSnowflakeSchema,
  partnerId: DiscordSnowflakeSchema.optional(),
  referenceMessageUrl: TrimmedString.url('Reference must be a valid Discord message URL.').optional(),
});

const AmountSchema = PositiveIntegerSchema.max(10_000_000, 'Amount exceeds supported range.');

const BuyTicketContextSchema = z.object({
  item: ShortLabelSchema,
  quantity: PositiveIntegerSchema.max(1_000, 'Quantity too large.').optional(),
  budgetRobux: AmountSchema.optional(),
  notes: RichDescriptionSchema,
});

const SellTicketContextSchema = z.object({
  item: ShortLabelSchema,
  quantity: PositiveIntegerSchema.max(1_000, 'Quantity too large.').optional(),
  priceRobux: AmountSchema.optional(),
  acceptsMiddleman: z.boolean().default(true),
  notes: RichDescriptionSchema,
});

const RobuxTicketContextSchema = z.object({
  amount: AmountSchema.min(100, 'The minimum trade amount is 100 Robux.'),
  paymentMethod: TrimmedString.min(3).max(40),
  notes: RichDescriptionSchema,
});

const NitroTicketContextSchema = z.object({
  plan: z.enum(['CLASSIC', 'BOOST', 'GIFT']).default('BOOST'),
  months: PositiveIntegerSchema.max(24, 'Nitro duration must be <= 24 months.').optional(),
  notes: RichDescriptionSchema,
});

const DecorTicketContextSchema = z.object({
  asset: ShortLabelSchema,
  theme: TrimmedString.min(3).max(60).optional(),
  notes: RichDescriptionSchema,
});

export const CreateGeneralTicketSchema = z.discriminatedUnion('type', [
  BaseGeneralTicketSchema.extend({
    type: z.literal('BUY'),
    context: BuyTicketContextSchema,
  }),
  BaseGeneralTicketSchema.extend({
    type: z.literal('SELL'),
    context: SellTicketContextSchema,
  }),
  BaseGeneralTicketSchema.extend({
    type: z.literal('ROBUX'),
    context: RobuxTicketContextSchema,
  }),
  BaseGeneralTicketSchema.extend({
    type: z.literal('NITRO'),
    context: NitroTicketContextSchema,
  }),
  BaseGeneralTicketSchema.extend({
    type: z.literal('DECOR'),
    context: DecorTicketContextSchema,
  }),
]);

export type CreateGeneralTicketDTO = z.infer<typeof CreateGeneralTicketSchema>;

export const CloseGeneralTicketSchema = z.object({
  ticketId: z.number().int().positive(),
  executorId: DiscordSnowflakeSchema,
  reason: TrimmedString.max(500, 'Reason must not exceed 500 characters.').optional(),
  allowStaffOverride: z.boolean().optional(),
});

export type CloseGeneralTicketDTO = z.infer<typeof CloseGeneralTicketSchema>;

export const ListUserTicketsSchema = z.object({
  userId: DiscordSnowflakeSchema,
  guildId: GuildSnowflakeSchema,
  includeClosed: z.boolean().optional(),
  limit: PositiveIntegerSchema.max(25).default(10),
});

export type ListUserTicketsDTO = z.infer<typeof ListUserTicketsSchema>;

export const CreateMiddlemanTicketSchema = z.object({
  userId: z.string().regex(/^\d+$/u, 'Invalid Discord ID'),
  guildId: z.string().regex(/^\d+$/u, 'Invalid guild ID'),
  type: z.literal('MM'),
  context: z.string().min(10).max(1000, 'Context must be 10-1000 chars'),
  partnerTag: z.string().optional(),
  robloxUsername: z.string().min(3).max(50).optional(),
});

export type CreateMiddlemanTicketDTO = z.infer<typeof CreateMiddlemanTicketSchema>;

export const ClaimTicketSchema = z.object({
  ticketId: z.number().int().positive(),
  middlemanId: z.string().regex(/^\d+$/u, 'Invalid Discord ID'),
});

export type ClaimTicketDTO = z.infer<typeof ClaimTicketSchema>;
