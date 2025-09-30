// ============================================================================
// RUTA: src/shared/config/constants.ts
// ============================================================================

import { PermissionFlagsBits, type PermissionResolvable } from 'discord.js';

export const COLORS = Object.freeze({
  primary: 0xff7b2b,
  success: 0x2ecc71,
  warning: 0xf1c40f,
  danger: 0xe74c3c,
  info: 0x3498db,
});

export const EMBED_LIMITS = Object.freeze({
  title: 256,
  description: 4096,
  fieldName: 256,
  fieldValue: 1024,
  footerText: 2048,
  maxFields: 25,
});

export const MODAL_LIMITS = Object.freeze({
  textInput: 1024,
  title: 45,
  customId: 100,
  maxComponents: 5,
});

export const COOLDOWNS = Object.freeze({
  ping: 5_000,
  help: 10_000,
  middlemanRequest: 60_000,
  generalTicket: 120_000,
  warnCommand: 5_000,
});

export const PERMISSIONS = Object.freeze({
  staff: [PermissionFlagsBits.ManageGuild, PermissionFlagsBits.ModerateMembers] as const,
  admin: [PermissionFlagsBits.Administrator] as const,
});

export type CommandCooldownKey = keyof typeof COOLDOWNS;
export type PermissionGroupKey = keyof typeof PERMISSIONS;
export type PermissionGroup = readonly PermissionResolvable[];
