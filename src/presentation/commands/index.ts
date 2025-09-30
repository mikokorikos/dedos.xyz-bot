// ============================================================================
// RUTA: src/presentation/commands/index.ts
// ============================================================================

import { configCommand } from '@/presentation/commands/admin/config';
import { dbCommand } from '@/presentation/commands/admin/db';
import { commandRegistry, getRegisteredCommands, registerCommands, serializeCommands } from '@/presentation/commands/command-registry';
import { helpCommand } from '@/presentation/commands/general/help';
import { pingCommand } from '@/presentation/commands/general/ping';
import { middlemanCommand } from '@/presentation/commands/middleman/middleman';
import { statsCommand } from '@/presentation/commands/stats/stats';
import { ticketCommand } from '@/presentation/commands/tickets/ticket';
import type { Command } from '@/presentation/commands/types';
import { warnCommand } from '@/presentation/commands/warns/warn';

const commands: Command[] = [
  pingCommand,
  helpCommand,
  middlemanCommand,
  ticketCommand,
  warnCommand,
  statsCommand,
  configCommand,
  dbCommand,
];

registerCommands(commands);

export { commandRegistry, getRegisteredCommands, serializeCommands };
