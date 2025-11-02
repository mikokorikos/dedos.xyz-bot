// services/panelService.js
// Envía los paneles oficiales (Robux / Ayuda) al canal correcto
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { config } from "../constants/config.js";
import { buildRobuxPanelEmbed, buildHelpPanelEmbed } from "../embeds/embeds.js";
import { sendEmbed } from "../utils/sendEmbed.js";

/**
 * Panel de compra Robux.
 * Sólo debe ir en ROBLOX_PANEL_CHANNEL_ID.
 */
export async function publishRobuxPanel(channel) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("abrir_ticket_compra")
      .setLabel("🛒 Comprar Robux")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setStyle(ButtonStyle.Link)
      .setLabel("📜 TOS / Reglas de compra")
      .setURL(
        `https://discord.com/channels/${channel.guild.id}/${config.TOS_CHANNEL_ID}`
      ),
    new ButtonBuilder()
      .setStyle(ButtonStyle.Link)
      .setLabel("👥 Grupo Roblox")
      .setURL("https://dedos.xyz/roblox")
  );

  await sendEmbed(channel, buildRobuxPanelEmbed, undefined, { components: [row] });
}

/**
 * Panel de ayuda/soporte.
 * Sólo debe ir en AYUDA_PANEL_CHANNEL_ID.
 */
export async function publishAyudaPanel(channel) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("abrir_ticket_ayuda")
      .setLabel("📩 Abrir Ticket de Ayuda")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setStyle(ButtonStyle.Link)
      .setLabel("📜 TOS / Reglas")
      .setURL(
        `https://discord.com/channels/${channel.guild.id}/${config.TOS_CHANNEL_ID}`
      ),
    new ButtonBuilder()
      .setStyle(ButtonStyle.Link)
      .setLabel("👥 Grupo Roblox")
      .setURL("https://dedos.xyz/roblox")
  );

  await sendEmbed(channel, buildHelpPanelEmbed, undefined, { components: [row] });
}
