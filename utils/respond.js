import { MessageFlags } from 'discord.js';

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
    const { flags, ...rest } = base;
    return rest;
  }
  return { ...base, flags: updatedFlags };
}

export async function sendCommandReply(ctx, payload, { ephemeral = false } = {}) {
  const interactionLike = 'isRepliable' in ctx && typeof ctx.isRepliable === 'function' && ctx.isRepliable();
  if (interactionLike) {
    const responsePayload = withEphemeralFlag(payload, ephemeral);
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
    const messagePayload = (() => {
      const base = { ...payload };
      if ('ephemeral' in base) {
        delete base.ephemeral;
      }
      if ('flags' in base) {
        delete base.flags;
      }
      return base;
    })();
    if (typeof ctx.reply === 'function') {
      return ctx.reply(messagePayload);
    }
    return ctx.channel.send(messagePayload);
  }
  throw new Error('No se pudo responder al comando');
}
