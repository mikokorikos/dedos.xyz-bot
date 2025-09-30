// ============================================================================
// RUTA: src/presentation/commands/types.ts
// ============================================================================

import type {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js';

import type { CommandCooldownKey } from '@/shared/config/constants';

type SlashBuilder =
  | SlashCommandBuilder
  | SlashCommandSubcommandsOnlyBuilder
  | SlashCommandOptionsOnlyBuilder;

type CommandCategory =
  | 'General'
  | 'Middleman'
  | 'Tickets'
  | 'Moderación'
  | 'Estadísticas'
  | 'Administración';

export interface CommandMeta {
  readonly category?: CommandCategory;
  readonly examples?: ReadonlyArray<string>;
  readonly cooldownKey?: CommandCooldownKey;
}

export interface Command extends CommandMeta {
  readonly data: SlashBuilder;
  readonly execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
  readonly guildIds?: ReadonlyArray<string>;
}
