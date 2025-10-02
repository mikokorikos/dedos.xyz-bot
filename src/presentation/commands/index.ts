// ============================================================================
// RUTA: src/presentation/commands/index.ts
// ============================================================================

import { commandRegistry, getRegisteredCommands, registerCommands, serializeCommands } from '@/presentation/commands/command-registry';
import { helpCommand } from '@/presentation/commands/general/help';
import { pingCommand } from '@/presentation/commands/general/ping';
import { middlemanCommand } from '@/presentation/commands/middleman/middleman';
import { ticketCommand } from '@/presentation/commands/tickets/ticket';
import type { Command } from '@/presentation/commands/types';

const commands: Command[] = [pingCommand, helpCommand, middlemanCommand, ticketCommand];

registerCommands(commands);

export { commandRegistry, getRegisteredCommands, serializeCommands };
