import { MessageFlags } from 'discord.js';
import { CONFIG } from '../config/config.js';
import { noPermissionEmbed } from './branding.js';
import { checkCooldown } from './cooldowns.js';
import { CooldownError, PermissionError, UserFacingError } from './errors.js';
import { logger } from './logger.js';
import { userIsAdmin } from './permissions.js';

async function resolveMember(ctx, userId) {
  if (ctx.member) return ctx.member;
  const guild = ctx.guild ?? ctx.client?.guilds?.cache?.get(ctx.guildId);
  if (!guild || !userId) return null;
  const cached = guild.members.cache.get(userId);
  if (cached) return cached;
  try {
    return await guild.members.fetch(userId);
  } catch (error) {
    logger.warn('No se pudo obtener miembro para permisos', error);
    return null;
  }
}

function withEphemeralFlag(payload, ephemeral) {
  if (ephemeral == null) {
    return { ...payload };
  }
  const base = { ...payload };
  if ('ephemeral' in base) {
    delete base.ephemeral;
  }
  const existingFlags = typeof payload.flags === 'number' ? payload.flags : Number(payload.flags ?? 0);
  if (Number.isNaN(existingFlags)) {
    return { ...base, flags: ephemeral ? MessageFlags.Ephemeral : undefined };
  }
  if (ephemeral) {
    return { ...base, flags: existingFlags | MessageFlags.Ephemeral };
  }
  const updatedFlags = existingFlags & ~MessageFlags.Ephemeral;
  if (updatedFlags === 0) {
    const { flags, ...rest } = { ...base };
    return rest;
  }
  return { ...base, flags: updatedFlags };
}

async function sendResponse(ctx, payload, { ephemeral } = {}) {
  const interactionLike = 'isRepliable' in ctx && typeof ctx.isRepliable === 'function' && ctx.isRepliable();
  if (interactionLike) {
    const responsePayload = withEphemeralFlag(payload, ephemeral ?? true);
    const alreadyReplied = Boolean(ctx.deferred || ctx.replied);
    if (alreadyReplied && 'followUp' in ctx && typeof ctx.followUp === 'function') {
      return ctx.followUp(responsePayload);
    }
    if (!alreadyReplied && 'reply' in ctx && typeof ctx.reply === 'function') {
      return ctx.reply(responsePayload);
    }
    if ('editReply' in ctx && typeof ctx.editReply === 'function') {
      const { flags, ...rest } = responsePayload;
      return ctx.editReply(rest);
    }
  }
  if ('channel' in ctx && typeof ctx.channel?.send === 'function') {
    const responsePayload = (() => {
      const base = { ...payload };
      if ('ephemeral' in base) {
        delete base.ephemeral;
      }
      if ('flags' in base) {
        delete base.flags;
      }
      return base;
    })();
    return ctx.reply?.(responsePayload) ?? ctx.channel.send(responsePayload);
  }
  throw new Error('Contexto no soportado para respuesta');
}

async function sendError(ctx, error) {
  if (error instanceof PermissionError) {
    await sendResponse(ctx, noPermissionEmbed(ctx.user?.tag ?? ctx.author?.tag ?? 'usuario'), { ephemeral: true });
    return;
  }
  if (error instanceof CooldownError) {
    const embed = noPermissionEmbed(ctx.user?.tag ?? ctx.author?.tag ?? 'usuario');
    embed.embeds[0]
      .setTitle('⌛ Cooldown activo')
      .setDescription(error.publicMessage);
    await sendResponse(ctx, embed, { ephemeral: true });
    return;
  }
  if (error instanceof UserFacingError) {
    const embed = noPermissionEmbed(ctx.user?.tag ?? ctx.author?.tag ?? 'usuario');
    embed.embeds[0]
      .setTitle('⚠️ Aviso')
      .setDescription(error.publicMessage);
    await sendResponse(ctx, embed, { ephemeral: true });
    return;
  }
  logger.error('Error inesperado en guard:', error);
  const embed = noPermissionEmbed(ctx.user?.tag ?? ctx.author?.tag ?? 'usuario');
  embed.embeds[0]
    .setTitle('❌ Error')
    .setDescription('Ocurrió un error inesperado al procesar la acción.');
  await sendResponse(ctx, embed, { ephemeral: true });
}

export function guard(handler, options = {}) {
  const adminRoleId = options.adminRoleId ?? CONFIG.ADMIN_ROLE_ID;
  const cooldownMs = options.cooldownMs ?? 2_000;
  const hasPermissionFn = options.hasPermission ?? ((member) => userIsAdmin(member, adminRoleId));
  return async (ctx, ...rest) => {
    try {
      const userId = ctx.user?.id ?? ctx.author?.id;
      const member = await resolveMember(ctx, userId);
      const allowed = await hasPermissionFn(member, ctx);
      if (!allowed) {
        throw new PermissionError();
      }
      if (cooldownMs > 0) {
        const { allowed, remainingMs } = checkCooldown(userId, handler.name, cooldownMs);
        if (!allowed) {
          throw new CooldownError(remainingMs);
        }
      }
      logger.flow('Ejecutando handler protegido', handler.name, 'para', userId);
      await handler(ctx, ...rest);
    } catch (error) {
      await sendError(ctx, error);
    }
  };
}
