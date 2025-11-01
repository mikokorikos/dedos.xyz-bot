// ============================================================================
// RUTA: src/presentation/events/index.ts
// ============================================================================

import { guildMemberAddEvent } from '@/presentation/events/guildMemberAdd';
import { interactionCreateEvent } from '@/presentation/events/interactionCreate';
import { messageCreateEvent } from '@/presentation/events/messageCreate';
import { messageDeleteEvent } from '@/presentation/events/messageDelete';
import { messageReactionAddEvent } from '@/presentation/events/messageReactionAdd';
import { readyEvent } from '@/presentation/events/ready';

export const events = [
  readyEvent,
  interactionCreateEvent,
  messageCreateEvent,
  guildMemberAddEvent,
  messageReactionAddEvent,
  messageDeleteEvent,
] as const;

export type AnyEventDescriptor = (typeof events)[number];
