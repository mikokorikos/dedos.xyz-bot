// ============================================================================
// RUTA: src/presentation/events/index.ts
// ============================================================================

import { interactionCreateEvent } from '@/presentation/events/interactionCreate';
import { readyEvent } from '@/presentation/events/ready';

export const events = [readyEvent, interactionCreateEvent] as const;

export type AnyEventDescriptor = (typeof events)[number];
