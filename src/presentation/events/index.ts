// ============================================================================
// RUTA: src/presentation/events/index.ts
// ============================================================================

import { guildMemberAddEvent } from '@/presentation/events/guildMemberAdd';
import { interactionCreateEvent } from '@/presentation/events/interactionCreate';
import { messageReactionAddEvent } from '@/presentation/events/messageReactionAdd';
import { readyEvent } from '@/presentation/events/ready';

export const events = [readyEvent, interactionCreateEvent, guildMemberAddEvent, messageReactionAddEvent] as const;

export type AnyEventDescriptor = (typeof events)[number];
