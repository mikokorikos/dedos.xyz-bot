// commands/slash.js
// Manejo de slash commands
import { config } from "../constants/config.js";
import { isOwner, isStaff } from "../services/permissions.js";
import {
  publishRobuxPanel,
  publishAyudaPanel,
} from "../services/panelService.js";
import {
  getPriceForRobux,
  getRobuxFromMxn,
  getRobuxFromUsd,
} from "../services/pricingService.js";
import {
  createCoupon,
  listActiveCoupons,
  deactivateCoupon,
} from "../services/couponService.js";
import {
  buildPriceQuoteEmbed,
  buildCouponsListEmbed,
} from "../embeds/embeds.js";
import { sendTranscriptById } from "../services/ticketService.js";
import { sendEmbed } from "../utils/sendEmbed.js";

/**
 * Limpia la lista de usuarios que se pasan al crear el cupón.
 * Acepta:
 *  - @usuario
 *  - <@1234567890>
 *  - <@!1234567890>
 *  - 1234567890
 *  - separados por comas
 */
function parseUserIdList(raw) {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .flatMap((token) => {
      const match = token.match(/(\d{5,})/);
      return match ? [match[1]] : [];
    })
    .filter((id, idx, arr) => arr.indexOf(id) === idx);
}

/**
 * handleSlashCommand(client, interaction)
 */
export async function handleSlashCommand(client, interaction) {
  const { commandName } = interaction;

  // /robux
  if (commandName === "robux") {
    if (!isStaff(interaction.member)) {
      return interaction.reply({
        content: `Para comprar Robux ve a <#${config.ROBLOX_PANEL_CHANNEL_ID}> y presiona "Comprar Robux" 🙌`,
        ephemeral: true,
      });
    }
    if (interaction.channel.id !== config.ROBLOX_PANEL_CHANNEL_ID) {
      return interaction.reply({
        content: `El panel oficial solo va en <#${config.ROBLOX_PANEL_CHANNEL_ID}>`,
        ephemeral: true,
      });
    }
    await publishRobuxPanel(interaction.channel);
    return interaction.reply({
      content: "Panel publicado ✅",
      ephemeral: true,
    });
  }

  // /ayuda
  if (commandName === "ayuda") {
    if (!isStaff(interaction.member)) {
      return interaction.reply({
        content: `El panel de ayuda está en <#${config.AYUDA_PANEL_CHANNEL_ID}> 🆘`,
        ephemeral: true,
      });
    }
    if (interaction.channel.id !== config.AYUDA_PANEL_CHANNEL_ID) {
      return interaction.reply({
        content: `El panel oficial solo va en <#${config.AYUDA_PANEL_CHANNEL_ID}>`,
        ephemeral: true,
      });
    }
    await publishAyudaPanel(interaction.channel);
    return interaction.reply({
      content: "Panel publicado ✅",
      ephemeral: true,
    });
  }

  // /precio
  if (commandName === "precio") {
    const robux = interaction.options.getInteger("robux", true);
    const p = getPriceForRobux(robux);
    return sendEmbed(
      interaction,
      buildPriceQuoteEmbed,
      {
        mode: "robux->precio",
        robux,
        mxn: p.mxn,
        usd: p.usd,
      },
      {
        method: "reply",
        ephemeral: true,
      }
    );
  }

  // /cuanto_mxn
  if (commandName === "cuanto_mxn") {
    const cantidad = interaction.options.getNumber("cantidad", true);
    const r = getRobuxFromMxn(cantidad);
    return sendEmbed(
      interaction,
      buildPriceQuoteEmbed,
      {
        mode: "mxn->robux",
        robux: r.robux,
        mxn: r.mxn,
        usd: r.usd,
      },
      {
        method: "reply",
        ephemeral: true,
      }
    );
  }

  // /cuanto_usd
  if (commandName === "cuanto_usd") {
    const cantidad = interaction.options.getNumber("cantidad", true);
    const r = getRobuxFromUsd(cantidad);
    return sendEmbed(
      interaction,
      buildPriceQuoteEmbed,
      {
        mode: "usd->robux",
        robux: r.robux,
        mxn: r.mxn,
        usd: r.usd,
      },
      {
        method: "reply",
        ephemeral: true,
      }
    );
  }

  // /crear-descuento
  if (commandName === "crear-descuento") {
    if (!isOwner(interaction.user.id)) {
      return interaction.reply({
        content: "❌ Solo el owner puede crear cupones.",
        ephemeral: true,
      });
    }

    const code = interaction.options
      .getString("code", true)
      .trim()
      .toUpperCase();
    const tipo = interaction.options.getString("tipo", true); // percent/fixed
    const valor = interaction.options.getNumber("valor", true);

    const expiraRaw = interaction.options.getString("expira", false);
    const usosmax =
      interaction.options.getInteger("usosmax", false) ?? 0;
    const rol = interaction.options.getString("rol", false) || null;

    const usuariosRaw =
      interaction.options.getString("usuarios", false) || "";
    const usuariosArr = parseUserIdList(usuariosRaw);

    const minrobux =
      interaction.options.getInteger("minrobux", false) ?? 0;
    const limiteusuario =
      interaction.options.getString("limiteusuario", false) || "once";
    const limiteusuarioNum =
      interaction.options.getInteger("limiteusuario_num", false) ?? null;

    const motivo =
      interaction.options.getString("motivo", false) || "";

    const expires_at =
      expiraRaw && expiraRaw.toLowerCase() !== "none"
        ? expiraRaw
        : null;

    if (
      limiteusuario === "custom" &&
      (!limiteusuarioNum || Number(limiteusuarioNum) <= 0)
    ) {
      return interaction.reply({
        content:
          "❌ Debes especificar cuántas veces podrá usarlo cada usuario cuando eliges 'custom'.",
        ephemeral: true,
      });
    }

    await createCoupon({
      code,
      discount_type: tipo,
      discount_value: valor,
      expires_at,
      max_uses_total: usosmax,
      role_required: rol,
      allowed_users: usuariosArr, // IDs limpios
      min_robux: minrobux,
      per_user_limit: limiteusuario,
      per_user_limit_custom: limiteusuario === "custom"
        ? Number(limiteusuarioNum)
        : null,
      reason: motivo,
    });

    return interaction.reply({
      content:
        `✅ Cupón ${code} creado.\n` +
        `Usuarios permitidos: ${
          usuariosArr.length
            ? usuariosArr.map((id) => `<@${id}>`).join(", ")
            : "Todos"
        }`,
      ephemeral: true,
    });
  }

  // /desactivar-descuento
  if (commandName === "desactivar-descuento") {
    if (!isOwner(interaction.user.id)) {
      return interaction.reply({
        content: "❌ Solo el owner puede desactivar cupones.",
        ephemeral: true,
      });
    }

    const codeRaw = interaction.options.getString("code", true);
    const code = codeRaw.trim().toUpperCase();

    const result = await deactivateCoupon(code);
    if (result.ok) {
      return interaction.reply({
        content: `🗑 Cupón ${code} desactivado.`,
        ephemeral: true,
      });
    } else {
      return interaction.reply({
        content: `No encontré el cupón ${code} o ya estaba inactivo.`,
        ephemeral: true,
      });
    }
  }

  // /cupones-activos
  if (commandName === "cupones-activos") {
    if (
      !isOwner(interaction.user.id) &&
      !isStaff(interaction.member)
    ) {
      return interaction.reply({
        content: "❌ Solo staff.",
        ephemeral: true,
      });
    }
    const coupons = await listActiveCoupons();
    return sendEmbed(
      interaction,
      buildCouponsListEmbed,
      coupons,
      {
        method: "reply",
        ephemeral: true,
      }
    );
  }

  // /transcripcion
  if (commandName === "transcripcion") {
    if (!isStaff(interaction.member)) {
      return interaction.reply({
        content: "❌ Solo staff.",
        ephemeral: true,
      });
    }
    const ticketId = interaction.options.getString("ticket", true);
    try {
      await sendTranscriptById(
        client,
        interaction.user,
        ticketId
      );
      return interaction.reply({
        content: `📄 Te mandé la transcripción de #${ticketId} por DM.`,
        ephemeral: true,
      });
    } catch (err) {
      console.error("Error enviando transcripción:", err);
      return interaction.reply({
        content:
          "❌ No pude mandar la transcripción (quizá no existe o no tiene transcript).",
        ephemeral: true,
      });
    }
  }

  // fallback
  return interaction.reply({
    content: "Comando no reconocido.",
    ephemeral: true,
  });
}
