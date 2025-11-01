// constants/config.js
// Centraliza toda la config que viene de .env
import "dotenv/config";

export const config = {
  // Auth de Discord
  TOKEN: process.env.TOKEN,
  CLIENT_ID: process.env.CLIENT_ID,
  OWNER_ID: process.env.OWNER_ID,

  // Servidor / guild
  GUILD_ID: process.env.GUILD_ID,
  TICKET_CATEGORY_ID: process.env.TICKET_CATEGORY_ID,
  TICKET_STAFF_ROLE_IDS: process.env.TICKET_STAFF_ROLE_IDS || "",
  VERIFIED_ROLE_ID: process.env.VERIFIED_ROLE_ID,
  TEMP_ROLE_ID: process.env.TEMP_ROLE_ID,
  VERIFICATION_CHANNEL_ID: process.env.VERIFICATION_CHANNEL_ID,
  TOS_CHANNEL_ID: process.env.TOS_CHANNEL_ID,

  // Canales de panel fijo (donde va el mensaje grande con botones)
  ROBLOX_PANEL_CHANNEL_ID: process.env.ROBLOX_PANEL_CHANNEL_ID,
  AYUDA_PANEL_CHANNEL_ID: process.env.AYUDA_PANEL_CHANNEL_ID,

  // Logs (ventas públicas y logs internos staff)
  PUBLIC_LOG_CHANNEL_ID: process.env.PUBLIC_ANNOUNCE_CHANNEL_ID,
  STAFF_LOG_CHANNEL_ID: process.env.LOG_CHANNEL_ID,

  // Economía
  PRICE_PER_1000_MXN: Number(process.env.PRICE_PER_1000_MXN || 110),
  MIN_FINAL_PRICE_MXN: Number(process.env.MIN_FINAL_PRICE_MXN || 50),

  // Conversión MXN <-> USD
  CURRENCY_API_URL:
    process.env.CURRENCY_API_URL ||
    "https://api.exchangerate.host/latest?base=MXN&symbols=USD",
  USD_FETCH_INTERVAL_MINUTES: Number(
    process.env.USD_FETCH_INTERVAL_MINUTES || 30
  ),

  // Base de datos MySQL
  DB_HOST: process.env.DB_HOST,
  DB_USER: process.env.DB_USER,
  DB_PASS: process.env.DB_PASS,
  DB_NAME: process.env.DB_NAME,
  DB_PORT: Number(process.env.DB_PORT || 3306),

  // Directorio donde se guardan transcripciones HTML
  TRANSCRIPTS_DIR: process.env.TRANSCRIPTS_DIR || "./transcripts",
};
