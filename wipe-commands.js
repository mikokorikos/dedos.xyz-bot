// wipe-commands.js
// Borra TODOS los slash commands del guild actual.
// Úsalo sólo si quieres limpiar totalmente el servidor.
// node wipe-commands.js
import "dotenv/config";
import { REST, Routes } from "discord.js";
import { config } from "./constants/config.js";

async function wipe() {
  if (!config.TOKEN || !config.CLIENT_ID || !config.GUILD_ID) {
    console.error("❌ Faltan TOKEN / CLIENT_ID / GUILD_ID en .env");
    process.exit(1);
  }

  const rest = new REST({ version: "10" }).setToken(config.TOKEN);

  try {
    console.log("🗑 Borrando slash commands del guild...");
    await rest.put(
      Routes.applicationGuildCommands(config.CLIENT_ID, config.GUILD_ID),
      { body: [] }
    );
    console.log("✅ Guild limpio (0 slash commands).");
  } catch (err) {
    console.error("❌ Error limpiando slash commands:", err);
  }
}

wipe();
