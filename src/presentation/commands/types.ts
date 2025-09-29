import type { ChatInputCommandInteraction, SlashCommandBuilder, SlashCommandSubcommandsOnlyBuilder } from 'discord.js';

type SlashBuilder = SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder;

export interface CommandContext {
  readonly interaction: ChatInputCommandInteraction;
}

export interface Command {
  readonly data: SlashBuilder;
  readonly execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
  readonly guildIds?: ReadonlyArray<string>;
}
