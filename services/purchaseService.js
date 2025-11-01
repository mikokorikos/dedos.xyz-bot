// services/purchaseService.js
// Operaciones sobre la tabla purchases
import { getDB } from "./db.js";

/**
 * Guarda el registro de compra inicial
 */
export async function createPurchaseRecord({
  ticketId,
  buyerDiscordId,
  robloxUsername,
  robuxAmount,
  priceBeforeMxn,
  couponCode,
  discountMxn,
  finalPriceMxn,
}) {
  const db = getDB();
  await db.execute(
    `INSERT INTO purchases
     (ticket_id, buyer_discord_id, roblox_username, robux_amount,
      price_before, coupon_code, discount_applied, price_after, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pendiente_pago')`,
    [
      ticketId,
      buyerDiscordId,
      robloxUsername,
      robuxAmount,
      priceBeforeMxn,
      couponCode || null,
      discountMxn,
      finalPriceMxn,
    ]
  );
}

/**
 * Actualiza el message_id del embed de estado dentro del ticket
 */
export async function updatePurchaseStatusMessageId(ticketId, messageId) {
  const db = getDB();
  await db.execute(
    `UPDATE purchases
     SET status_message_id = ?
     WHERE ticket_id = ?`,
    [messageId, ticketId]
  );
}

/**
 * Buscar una compra por ticket
 */
export async function getPurchaseByTicket(ticketId) {
  const db = getDB();
  const [rows] = await db.execute(
    `SELECT *
     FROM purchases
     WHERE ticket_id = ?
     LIMIT 1`,
    [ticketId]
  );
  return rows[0] || null;
}

/**
 * Cambiar el estado de la compra (pagado, en_entrega, entregado...)
 * Devuelve la fila ya actualizada.
 */
export async function updatePurchaseStatus(ticketId, newStatus) {
  const db = getDB();
  await db.execute(
    `UPDATE purchases
     SET status = ?, updated_at = NOW()
     WHERE ticket_id = ?`,
    [newStatus, ticketId]
  );

  const [rows] = await db.execute(
    `SELECT *
     FROM purchases
     WHERE ticket_id = ?
     LIMIT 1`,
    [ticketId]
  );
  return rows[0] || null;
}

/**
 * Primer compra que se registró con esa cuenta de Roblox.
 * Sirve como anti-fraude "primera compra".
 */
export async function getFirstPurchaseRecord(robloxUsername) {
  const db = getDB();
  const [rows] = await db.execute(
    `SELECT ticket_id, buyer_discord_id, created_at
     FROM purchases
     WHERE roblox_username = ?
     ORDER BY created_at ASC
     LIMIT 1`,
    [robloxUsername]
  );
  return rows[0] || null;
}
