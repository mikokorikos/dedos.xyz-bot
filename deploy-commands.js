// deploy-commands.js
// Registra / actualiza TODOS los slash commands en TU servidor.
// Usa PUT => reemplaza la lista completa (no duplica).
// node deploy-commands.js
import "dotenv/config";
import { REST, Routes } from "discord.js";
import { config } from "./constants/config.js";
import { commandsData } from "./commands/registerData.js";

async function main() {
  if (!config.TOKEN || !config.CLIENT_ID || !config.GUILD_ID) {
    console.error("❌ Faltan TOKEN / CLIENT_ID / GUILD_ID en .env");
    process.exit(1);
  }

  const rest = new REST({ version: "10" }).setToken(config.TOKEN);

  try {
    console.log("⏳ Registrando slash commands...");
    await rest.put(
      Routes.applicationGuildCommands(config.CLIENT_ID, config.GUILD_ID),
      { body: commandsData }
    );
    console.log("✅ Slash commands registrados / actualizados.");
  } catch (err) {
    console.error("❌ Error registrando slash commands:", err);
  }
}

main();
