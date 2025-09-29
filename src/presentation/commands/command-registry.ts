import { Collection, type RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';

import { pingCommand } from '@/presentation/commands/general/ping';
import type { Command } from '@/presentation/commands/types';

const commandList: Command[] = [pingCommand];

export const commandRegistry = new Collection<string, Command>();

for (const command of commandList) {
  commandRegistry.set(command.data.name, command);
}

export const serializeCommands = (): RESTPostAPIApplicationCommandsJSONBody[] =>
  commandList.map((command) => command.data.toJSON());
