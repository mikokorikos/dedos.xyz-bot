// services/db.js
// Conexión y bootstrap de MySQL
import mysql from "mysql2/promise";
import fs from "fs/promises";
import { config } from "../constants/config.js";

let pool;
let dbProxy;
let initializing = null;

function shouldReconnect(error) {
  if (!error) return false;
  if (error.fatal) return true;
  const reconnectableCodes = new Set([
    "PROTOCOL_CONNECTION_LOST",
    "ECONNRESET",
    "EPIPE",
    "PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR",
    "PROTOCOL_ENQUEUE_AFTER_QUIT",
    "PROTOCOL_ENQUEUE_HANDSHAKE_TWICE",
  ]);
  if (error.code && reconnectableCodes.has(error.code)) {
    return true;
  }
  const message = String(error.message || "");
  if (message.toLowerCase().includes("closed state")) {
    return true;
  }
  if (message.toLowerCase().includes("connection lost")) {
    return true;
  }
  return false;
}

async function runWithRetry(method, args) {
  let attempt = 0;
  while (attempt < 2) {
    try {
      if (!pool) {
        throw new Error("DB no inicializada.");
      }
      return await pool[method](...args);
    } catch (error) {
      if (shouldReconnect(error) && attempt === 0) {
        console.warn("⚠️ Conexión MySQL perdida. Reintentando...", error.message);
        try {
          await initDB(true);
        } catch (reconnectError) {
          console.error("Error al intentar reconectar MySQL:", reconnectError);
          throw reconnectError;
        }
        attempt += 1;
        continue;
      }
      console.error("Error al ejecutar consulta MySQL:", error);
      throw error;
    }
  }
  throw new Error("No se pudo ejecutar la consulta MySQL después de reintentos.");
}

function ensureProxy() {
  if (dbProxy) {
    return dbProxy;
  }
  dbProxy = {
    query: (...args) => runWithRetry("query", args),
    execute: (...args) => runWithRetry("execute", args),
  };
  return dbProxy;
}

async function setupSchema(connection) {
  // Tabla de tickets
  await connection.query(`
    CREATE TABLE IF NOT EXISTS tickets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      ticket_id VARCHAR(10) NOT NULL UNIQUE,
      ticket_type ENUM('compra','ayuda') DEFAULT 'compra',
      user_id VARCHAR(50) NOT NULL,
      username VARCHAR(100) NOT NULL,
      channel_id VARCHAR(50) NOT NULL,
      opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      closed_at DATETIME NULL,
      has_transcript BOOLEAN DEFAULT FALSE,
      reason TEXT NULL,
      INDEX idx_ticket_id (ticket_id),
      INDEX idx_channel_id (channel_id),
      INDEX idx_user_id (user_id)
    );
  `);

  // Tabla de compras
  await connection.query(`
    CREATE TABLE IF NOT EXISTS purchases (
      id INT AUTO_INCREMENT PRIMARY KEY,
      ticket_id VARCHAR(10) NOT NULL,
      buyer_discord_id VARCHAR(50) NOT NULL,
      roblox_username VARCHAR(100) NOT NULL,
      robux_amount INT NOT NULL,
      price_before DECIMAL(10,2) NOT NULL,
      coupon_code VARCHAR(50),
      discount_applied DECIMAL(10,2) DEFAULT 0.00,
      price_after DECIMAL(10,2) NOT NULL,
      status ENUM(
        'pendiente_pago',
        'pagado',
        'en_entrega',
        'entregado',
        'cancelado'
      ) DEFAULT 'pendiente_pago',
      status_message_id VARCHAR(50),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_ticket_id (ticket_id),
      INDEX idx_roblox (roblox_username),
      INDEX idx_buyer (buyer_discord_id)
    );
  `);

  // Tabla de cupones
  await connection.query(`
    CREATE TABLE IF NOT EXISTS coupons (
      code VARCHAR(50) PRIMARY KEY,
      expires_at DATETIME NULL,
      max_uses_total INT DEFAULT 0,          -- 0 = ilimitado
      times_used INT DEFAULT 0,              -- cuántas veces usado
      role_required VARCHAR(50) NULL,        -- ID de rol requerido o NULL
      allowed_users TEXT NULL,               -- JSON de IDs de usuarios permitidos
      min_robux INT DEFAULT 0,               -- mínimo de Robux para aplicar
      per_user_limit ENUM('once','multi','custom') DEFAULT 'once',
      -- 'once'   => sólo primera compra
      -- 'multi'  => se puede reutilizar
      -- 'custom' => máximo definido por usuario de Discord
      per_user_limit_custom INT DEFAULT NULL,

      discount_type ENUM('percent','fixed') NOT NULL,
      -- percent => discount_value = porcentaje
      -- fixed   => discount_value = MXN fijo

      discount_value DECIMAL(10,2) NOT NULL,
      reason TEXT,
      active BOOLEAN DEFAULT TRUE
    );
  `);

  // Asegurar compatibilidad con instalaciones anteriores (nuevas columnas)
  const [perUserLimitColumn] = await connection.query(
    "SHOW COLUMNS FROM coupons LIKE 'per_user_limit'"
  );
  if (
    Array.isArray(perUserLimitColumn) &&
    perUserLimitColumn[0] &&
    typeof perUserLimitColumn[0].Type === "string" &&
    !perUserLimitColumn[0].Type.includes("custom")
  ) {
    await connection.query(
      "ALTER TABLE coupons MODIFY COLUMN per_user_limit ENUM('once','multi','custom') DEFAULT 'once'"
    );
  }

  const [customLimitColumn] = await connection.query(
    "SHOW COLUMNS FROM coupons LIKE 'per_user_limit_custom'"
  );
  if (!Array.isArray(customLimitColumn) || customLimitColumn.length === 0) {
    await connection.query(
      "ALTER TABLE coupons ADD COLUMN per_user_limit_custom INT DEFAULT NULL"
    );
  }

  // Historial de uso de cupones
  await connection.query(`
    CREATE TABLE IF NOT EXISTS coupon_usage (
      id INT AUTO_INCREMENT PRIMARY KEY,
      coupon_code VARCHAR(50) NOT NULL,
      roblox_username VARCHAR(100) NOT NULL,
      discord_user_id VARCHAR(50) NOT NULL,
      ticket_id VARCHAR(10),
      used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_coupon (coupon_code),
      INDEX idx_roblox_user (roblox_username),
      INDEX idx_discord_user (discord_user_id)
    );
  `);
}

async function createPool() {
  const newPool = mysql.createPool({
    host: config.DB_HOST,
    user: config.DB_USER,
    password: config.DB_PASS,
    database: config.DB_NAME,
    port: config.DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  newPool.on("error", (error) => {
    console.error("Error en el pool de MySQL:", error);
  });

  const connection = await newPool.getConnection();
  try {
    await setupSchema(connection);
  } finally {
    connection.release();
  }

  await fs.mkdir(config.TRANSCRIPTS_DIR, { recursive: true });

  console.log("✅ DB conectada y tablas listas.");

  return newPool;
}

/**
 * initDB()
 * - Conecta a MySQL con pool de conexiones
 * - Crea / migra tablas críticas
 * - Asegura carpeta de transcripts
 */
export async function initDB(force = false) {
  if (!force && dbProxy) {
    return dbProxy;
  }

  if (initializing) {
    return initializing;
  }

  initializing = (async () => {
    if (pool) {
      await pool.end().catch(() => {});
      pool = null;
    }

    pool = await createPool();
    const proxy = ensureProxy();
    return proxy;
  })();

  try {
    return await initializing;
  } finally {
    initializing = null;
  }
}

export function getDB() {
  if (!dbProxy) {
    throw new Error("DB not initialized yet.");
  }
  return dbProxy;
}
