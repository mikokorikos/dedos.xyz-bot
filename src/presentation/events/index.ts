import type { ClientEvents } from 'discord.js';

import { interactionCreateEvent } from '@/presentation/events/interactionCreate';
import { readyEvent } from '@/presentation/events/ready';

export type EventDescriptor<K extends keyof ClientEvents> = {
  readonly name: K;
  readonly once: boolean;
  readonly execute: (...args: ClientEvents[K]) => Promise<void> | void;
};

export const events: ReadonlyArray<EventDescriptor<keyof ClientEvents>> = [readyEvent, interactionCreateEvent];
