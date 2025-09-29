// ============================================================================
// RUTA: src/presentation/commands/command-registry.ts
// ============================================================================

import { Collection, type RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';

import type { Command } from '@/presentation/commands/types';

export const commandRegistry = new Collection<string, Command>();

const registeredCommands: Command[] = [];

export const registerCommands = (commands: ReadonlyArray<Command>): void => {
  for (const command of commands) {
    const name = command.data.name;

    if (commandRegistry.has(name)) {
      throw new Error(`El comando ${name} ya fue registrado.`);
    }

    commandRegistry.set(name, command);
    registeredCommands.push(command);
  }
};

export const getRegisteredCommands = (): ReadonlyArray<Command> => [...registeredCommands];

export const serializeCommands = (): RESTPostAPIApplicationCommandsJSONBody[] =>
  registeredCommands.map((command) => command.data.toJSON());
