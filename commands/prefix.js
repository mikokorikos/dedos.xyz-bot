// commands/prefix.js
// Manejo de comandos con prefijo ";"
import { config } from "../constants/config.js";
import { GIF_PATH } from "../constants/ui.js";
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
  listActiveCoupons,
  deactivateCoupon,
} from "../services/couponService.js";
import {
  buildPriceQuoteEmbed,
  buildCouponsListEmbed,
  buildRulesEmbed,
} from "../embeds/embeds.js";
import { sendTranscriptById } from "../services/ticketService.js";

export async function handlePrefixCommand(client, message) {
  const args = message.content.slice(1).trim().split(/\s+/);
  const cmd = (args.shift() || "").toLowerCase();

  // ;robux
  if (cmd === "robux") {
    if (!isStaff(message.member)) {
      try {
        await message.author.send(
          `Para comprar Robux ve a <#${config.ROBLOX_PANEL_CHANNEL_ID}> y presiona "Comprar Robux" 🙌`
        );
      } catch {}
      return;
    }
    if (message.channel.id !== config.ROBLOX_PANEL_CHANNEL_ID) {
      await message.reply(
        `El panel oficial solo va en <#${config.ROBLOX_PANEL_CHANNEL_ID}>`
      );
      return;
    }
    await publishRobuxPanel(message.channel);
    await message.reply("Panel publicado ✅");
    return;
  }

  // ;ayuda
  if (cmd === "ayuda") {
    if (!isStaff(message.member)) {
      try {
        await message.author.send(
          `El panel de ayuda está en <#${config.AYUDA_PANEL_CHANNEL_ID}> 🆘`
        );
      } catch {}
      return;
    }
    if (message.channel.id !== config.AYUDA_PANEL_CHANNEL_ID) {
      await message.reply(
        `El panel oficial solo va en <#${config.AYUDA_PANEL_CHANNEL_ID}>`
      );
      return;
    }
    await publishAyudaPanel(message.channel);
    await message.reply("Panel publicado ✅");
    return;
  }

  // ;precio <robux>
  if (cmd === "precio") {
    const robux = parseInt(args[0], 10);
    if (!robux || robux <= 0) {
      await message.reply(
        "Uso: `;precio <robux>` (ejemplo: ;precio 1000)"
      );
      return;
    }
    const p = getPriceForRobux(robux);
    const embed = buildPriceQuoteEmbed({
      mode: "robux->precio",
      robux,
      mxn: p.mxn,
      usd: p.usd,
    });
    await message.reply({ embeds: [embed], files: [GIF_PATH] });
    return;
  }

  // ;cuanto_mxn <mxn>
  if (cmd === "cuanto_mxn") {
    const mxnVal = parseFloat(args[0]);
    if (!mxnVal || mxnVal <= 0) {
      await message.reply(
        "Uso: `;cuanto_mxn <mxn>` (ejemplo: ;cuanto_mxn 110)"
      );
      return;
    }
    const r = getRobuxFromMxn(mxnVal);
    const embed = buildPriceQuoteEmbed({
      mode: "mxn->robux",
      robux: r.robux,
      mxn: r.mxn,
      usd: r.usd,
    });
    await message.reply({ embeds: [embed], files: [GIF_PATH] });
    return;
  }

  // ;cuanto_usd <usd>
  if (cmd === "cuanto_usd") {
    const usdVal = parseFloat(args[0]);
    if (!usdVal || usdVal <= 0) {
      await message.reply(
        "Uso: `;cuanto_usd <usd>` (ejemplo: ;cuanto_usd 10)"
      );
      return;
    }
    const r = getRobuxFromUsd(usdVal);
    const embed = buildPriceQuoteEmbed({
      mode: "usd->robux",
      robux: r.robux,
      mxn: r.mxn,
      usd: r.usd,
    });
    await message.reply({ embeds: [embed], files: [GIF_PATH] });
    return;
  }

  // ;cupones-activos  (staff / owner)
  if (cmd === "cupones-activos") {
    if (!isOwner(message.author.id) && !isStaff(message.member)) {
      await message.reply("❌ Solo staff.");
      return;
    }
    const coupons = await listActiveCoupons();
    const embed = buildCouponsListEmbed(coupons);

    try {
      await message.author.send({ embeds: [embed] });
      await message.reply(
        "📬 Te mandé los cupones activos por DM (revisa inbox)."
      );
    } catch {
      await message.reply({
        embeds: [embed],
        content:
          "⚠ No pude mandarte DM, así que lo dejo aquí (borra este mensaje luego).",
      });
    }
    return;
  }

  // ;desactivar-descuento <code>
  if (cmd === "desactivar-descuento") {
    if (!isOwner(message.author.id)) {
      await message.reply("❌ Solo el owner puede desactivar cupones.");
      return;
    }
    const code = (args[0] || "").toUpperCase();
    if (!code) {
      await message.reply(
        "Uso: `;desactivar-descuento <CUPON>`"
      );
      return;
    }
    const result = await deactivateCoupon(code);
    if (result.ok) {
      await message.reply(`🗑 Cupón ${code} desactivado.`);
    } else {
      await message.reply(
        `No encontré el cupón ${code} o ya estaba inactivo.`
      );
    }
    return;
  }

  // ;transcripcion <ticketId>
  if (cmd === "transcripcion") {
    if (!isStaff(message.member)) {
      await message.reply("❌ Solo staff.");
      return;
    }
    const tId = args[0];
    if (!tId) {
      await message.reply("Uso: `;transcripcion <id>`");
      return;
    }
    try {
      await sendTranscriptById(client, message.author, tId);
      await message.reply(
        `📄 Te mandé la transcripción del ticket #${tId} por DM.`
      );
    } catch (err) {
      console.error("Error al obtener transcripción:", err);
      await message.reply(
        "❌ No pude mandar la transcripción (quizá no existe o no tiene transcript)."
      );
    }
    return;
  }

  // ;reglas
  if (cmd === "reglas") {
    const reglasEmbed = buildRulesEmbed();
    const sent = await message.channel.send({
      embeds: [reglasEmbed],
      files: [GIF_PATH],
    });
    // Reacción ✅ para verificación
    await sent.react("✅").catch(console.error);
    return;
  }

  // fallback
  // ignoramos comandos desconocidos
}
