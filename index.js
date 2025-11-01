// index.js
// Punto de entrada principal del bot
import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  Partials,
} from "discord.js";
import fs from "fs/promises";

import { config } from "./constants/config.js";
import { initDB } from "./services/db.js";
import { startFxRateService } from "./services/fxRateService.js";
import { handlePrefixCommand } from "./commands/prefix.js";
import { handleSlashCommand } from "./commands/slash.js";
import { handleButtonInteraction } from "./interactions/handleButtons.js";
import { handleModalSubmit } from "./interactions/handleModals.js";
import { buildWelcomeDMEmbed, buildVerifiedDMEmbed } from "./embeds/embeds.js";
import { GIF_PATH } from "./constants/ui.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [
    Partials.Message,
    Partials.Reaction,
    Partials.Channel,
    Partials.User,
  ],
});

client.once("ready", async () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);

  await initDB();

  // asegurar carpeta transcripts
  await fs.mkdir(config.TRANSCRIPTS_DIR, { recursive: true }).catch(() => {});

  // servicio de tasa USD/MXN
  startFxRateService();
});

// Prefijo ;
client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;
  if (!message.content.startsWith(";")) return;
  try {
    await handlePrefixCommand(client, message);
  } catch (err) {
    console.error("Error en prefix command:", err);
  }
});

// Slash / y demás interacciones
client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      await handleSlashCommand(client, interaction);
      return;
    }
    if (interaction.isButton()) {
      await handleButtonInteraction(client, interaction);
      return;
    }
    if (interaction.isModalSubmit()) {
      await handleModalSubmit(client, interaction);
      return;
    }
  } catch (err) {
    console.error("Error en interactionCreate:", err);
    try {
      if (!interaction.replied) {
        await interaction.reply({
          content: "❌ Hubo un error.",
          ephemeral: true,
        });
      }
    } catch {
      /* ignore */
    }
  }
});

// Verificación por reacción con ✅
client.on("messageReactionAdd", async (reaction, user) => {
  if (user.bot) return;
  if (reaction.emoji.name !== "✅") return;
  if (!reaction.message || !reaction.message.channel) return;
  if (reaction.message.channel.id !== config.VERIFICATION_CHANNEL_ID) return;

  try {
    const guild = reaction.message.guild;
    const member = await guild.members.fetch(user.id).catch(() => null);
    if (!member) return;

    const verifiedRole = guild.roles.cache.get(config.VERIFIED_ROLE_ID);
    const tempRole = guild.roles.cache.get(config.TEMP_ROLE_ID);

    if (!verifiedRole) {
      console.warn(
        `⚠️ No se encontró el rol verificado (ID: ${config.VERIFIED_ROLE_ID})`
      );
      return;
    }

    // Si ya lo tiene, salir
    if (member.roles.cache.has(verifiedRole.id)) return;

    // Añadir rol verificado
    await member.roles.add(verifiedRole).catch(console.error);

    // Quitar rol temporal si aplica
    if (tempRole && member.roles.cache.has(tempRole.id)) {
      await member.roles.remove(tempRole).catch(console.error);
    }

    // DM de verificación
    try {
      const embed = await buildVerifiedDMEmbed(guild);
      await user.send({
        embeds: [embed],
        files: [GIF_PATH],
      });
    } catch (dmErr) {
      console.warn(
        `⚠️ No se pudo enviar DM de verificación a ${user.tag}`,
        dmErr.message
      );
    }

    console.log(
      `✅ ${user.tag} verificado. Rol verificado añadido, rol temporal eliminado.`
    );
  } catch (error) {
    console.error("Error en verificación:", error);
  }
});

// Bienvenida y rol temporal
client.on("guildMemberAdd", async (member) => {
  // Rol temporal
  try {
    const tempRole = member.guild.roles.cache.get(config.TEMP_ROLE_ID);
    if (tempRole) {
      await member.roles.add(tempRole).catch(console.error);
      console.log(
        `+ Rol temporal (ID: ${config.TEMP_ROLE_ID}) asignado a ${member.user.tag}`
      );
    } else {
      console.warn(
        `⚠️ No se encontró el rol temporal (ID: ${config.TEMP_ROLE_ID}) para asignar.`
      );
    }
  } catch (roleError) {
    console.error(
      `Error al asignar rol temporal a ${member.user.tag}:`,
      roleError
    );
  }

  // DM bienvenida
  try {
    const bienvenidaEmbed = await buildWelcomeDMEmbed(member.guild);
    await member.send({
      embeds: [bienvenidaEmbed],
      files: [GIF_PATH],
    });
  } catch (dmError) {
    console.warn(
      `⚠️ No se pudo enviar DM de bienvenida a ${member.user.tag}`
    );
  }

  console.log(`👋 ${member.user.tag} se unió al servidor`);
});

// Errores globales
client.on("error", (err) => {
  console.error("Error del bot:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled promise rejection:", err);
});

// Login
client.login(config.TOKEN);
