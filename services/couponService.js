// services/couponService.js
// Lógica de cupones: creación, validación, registro de uso, etc.
import { getDB } from "./db.js";
import { config } from "../constants/config.js";
import { getFirstPurchaseRecord } from "./purchaseService.js";

/**
 * Normaliza allowed_users (JSON string en DB) -> array de IDs
 */
function parseAllowedUsers(jsonText) {
  if (!jsonText) return [];
  try {
    const arr = JSON.parse(jsonText);
    if (Array.isArray(arr)) return arr;
  } catch (e) {
    /* ignore */
  }
  return [];
}

/**
 * Crea cupón en DB
 * data = {
 *   code, expires_at, max_uses_total, role_required,
 *   allowed_users: [ids...], min_robux, per_user_limit,
 *   discount_type, discount_value, reason
 * }
 */
export async function createCoupon(data) {
  const db = getDB();
  await db.execute(
    `INSERT INTO coupons
      (code, expires_at, max_uses_total, role_required, allowed_users,
       min_robux, per_user_limit, discount_type, discount_value, reason, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
    [
      data.code,
      data.expires_at || null,
      data.max_uses_total ?? 0,
      data.role_required || null,
      data.allowed_users && data.allowed_users.length
        ? JSON.stringify(data.allowed_users)
        : null,
      data.min_robux ?? 0,
      data.per_user_limit || "once",
      data.discount_type,
      data.discount_value,
      data.reason || "",
    ]
  );
  return { ok: true };
}

/**
 * Lista cupones activos
 */
export async function listActiveCoupons() {
  const db = getDB();
  const [rows] = await db.execute(
    `SELECT *
     FROM coupons
     WHERE active = TRUE`
  );
  return rows;
}

/**
 * Buscar cupón activo por código
 */
export async function getCouponByCode(code) {
  if (!code) return null;
  const db = getDB();
  const [rows] = await db.execute(
    `SELECT *
     FROM coupons
     WHERE code = ?
       AND active = TRUE
     LIMIT 1`,
    [code]
  );
  return rows[0] || null;
}

/**
 * ¿El cupón ya expiró?
 */
function isExpired(coupon) {
  if (!coupon.expires_at) return false;
  const exp = new Date(coupon.expires_at);
  return Date.now() > exp.getTime();
}

/**
 * ¿Quedan usos globales?
 */
function hasGlobalUsesLeft(coupon) {
  if (Number(coupon.max_uses_total) === 0) {
    return true; // ilimitado
  }
  return Number(coupon.times_used) < Number(coupon.max_uses_total);
}

/**
 * Anti-fraude "primera compra":
 * - Si per_user_limit === 'once'
 * - Y la cuenta Roblox YA APARECE en purchases (alguien le compró antes)
 * => bloqueamos y marcamos fraude.
 */
async function checkFirstPurchaseRestriction(coupon, robloxUsername) {
  if (coupon.per_user_limit !== "once") {
    return { blocked: false, info: null };
  }

  const first = await getFirstPurchaseRecord(robloxUsername);
  if (!first) {
    // nunca ha comprado -> permitido
    return { blocked: false, info: null };
  }

  // ya existe compra previa -> esto debería ser SOLO primera compra
  return {
    blocked: true,
    info: {
      robloxUsername,
      priorTicketId: first.ticket_id,
      priorBuyerDiscordId: first.buyer_discord_id,
      priorCreatedAt: first.created_at,
    },
  };
}

/**
 * Calcula el descuento y verifica restricciones de un cupón.
 * Devuelve:
 * { ok, message, finalPriceMxn, discountMxn, couponUsed, meta,
 *   fraudFlag, fraudInfo }
 */
export async function validateCoupon({
  couponCode,
  robuxAmount,
  robloxUsername,
  discordMember,
  discordUserId,
  priceBeforeMxn,
}) {
  if (!couponCode) {
    return {
      ok: true,
      finalPriceMxn: priceBeforeMxn,
      discountMxn: 0,
      couponUsed: null,
      meta: null,
      fraudFlag: false,
      fraudInfo: null,
    };
  }

  const coupon = await getCouponByCode(couponCode.trim().toUpperCase());
  if (!coupon) {
    return {
      ok: false,
      message: "Código inválido o inactivo.",
      fraudFlag: false,
      fraudInfo: null,
    };
  }

  // expirado
  if (isExpired(coupon)) {
    return {
      ok: false,
      message: "Este código ya expiró.",
      fraudFlag: false,
      fraudInfo: null,
    };
  }

  // usos globales
  if (!hasGlobalUsesLeft(coupon)) {
    return {
      ok: false,
      message: "Este código ya fue usado al máximo.",
      fraudFlag: false,
      fraudInfo: null,
    };
  }

  // mínimo de robux
  if (Number(robuxAmount) < Number(coupon.min_robux || 0)) {
    return {
      ok: false,
      message: `Este código requiere mínimo ${coupon.min_robux} Robux.`,
      fraudFlag: false,
      fraudInfo: null,
    };
  }

  // restricción por rol
  if (coupon.role_required) {
    const hasRole = discordMember.roles.cache.has(coupon.role_required);
    if (!hasRole) {
      return {
        ok: false,
        message: "Solo usuarios con rol especial pueden usar este código.",
        fraudFlag: false,
        fraudInfo: null,
      };
    }
  }

  // usuarios permitidos específicos
  const allowed = parseAllowedUsers(coupon.allowed_users);
  if (allowed.length > 0 && !allowed.includes(discordUserId)) {
    return {
      ok: false,
      message: "Este código no está autorizado para tu cuenta.",
      fraudFlag: false,
      fraudInfo: null,
    };
  }

  // primera compra?
  const firstCheck = await checkFirstPurchaseRestriction(
    coupon,
    robloxUsername
  );
  if (firstCheck.blocked) {
    // esto dispara alerta de "posible abuso"
    return {
      ok: false,
      message: "Este código es solo para primera compra.",
      fraudFlag: true,
      fraudInfo: {
        ...firstCheck.info,
        couponCode: coupon.code,
      },
    };
  }

  // calcular descuento
  let discountMxn = 0;
  if (coupon.discount_type === "percent") {
    discountMxn =
      Number(priceBeforeMxn) * (Number(coupon.discount_value) / 100);
  } else {
    // fixed
    discountMxn = Number(coupon.discount_value);
  }

  let finalPriceMxn = Number(priceBeforeMxn) - discountMxn;
  if (finalPriceMxn < 0) finalPriceMxn = 0;

  // piso mínimo anti-typo
  if (finalPriceMxn < config.MIN_FINAL_PRICE_MXN) {
    return {
      ok: false,
      message:
        "Este descuento no aplica a esta compra (precio quedaría demasiado bajo).",
      fraudFlag: false,
      fraudInfo: null,
    };
  }

  // Metadata para logs bonitos
  const expiresAtDesc = coupon.expires_at
    ? new Date(coupon.expires_at).toLocaleString("es-MX")
    : "Sin expiración";

  let scopeDesc = "Público";
  if (allowed.length > 0) {
    scopeDesc = "Usuarios específicos";
  } else if (coupon.role_required) {
    scopeDesc = "Rol especial";
  }
  if (coupon.per_user_limit === "once") {
    scopeDesc += " • Primera compra";
  }

  const perUserLimitDesc =
    coupon.per_user_limit === "once"
      ? "1 vez por cuenta Roblox"
      : "Reutilizable";

  const publicOrPrivateDesc =
    allowed.length > 0 ? "Cupón personalizado" : "Público";

  const meta = {
    scope_desc: scopeDesc,
    expires_at_desc: expiresAtDesc,
    per_user_limit_desc: perUserLimitDesc,
    public_or_private_desc: publicOrPrivateDesc,
    min_robux_required: coupon.min_robux || 0,
    coupon_reason: coupon.reason || "—",
    discount_display:
      coupon.discount_type === "percent"
        ? `${coupon.discount_value}%`
        : `$${coupon.discount_value} MXN`,
  };

  return {
    ok: true,
    finalPriceMxn,
    discountMxn,
    couponUsed: coupon,
    meta,
    fraudFlag: false,
    fraudInfo: null,
  };
}

/**
 * Registra el uso del cupón en coupon_usage,
 * incrementa times_used y devuelve info de "cuántos usos quedan".
 */
export async function registerCouponUse({
  coupon,
  robloxUsername,
  discordUserId,
  ticketId,
}) {
  if (!coupon) {
    return {
      remainingUsesText: null,
    };
  }

  const db = getDB();

  // Historial
  await db.execute(
    `INSERT INTO coupon_usage
      (coupon_code, roblox_username, discord_user_id, ticket_id)
     VALUES (?, ?, ?, ?)`,
    [coupon.code, robloxUsername, discordUserId, ticketId]
  );

  // Aumentar contador global
  await db.execute(
    `UPDATE coupons
     SET times_used = times_used + 1
     WHERE code = ?`,
    [coupon.code]
  );

  // Volver a leer el cupón con contador actualizado
  const [rows] = await db.execute(
    `SELECT *
     FROM coupons
     WHERE code = ?
     LIMIT 1`,
    [coupon.code]
  );
  const updated = rows[0];

  return {
    remainingUsesText: describeRemainingUses(updated),
    updatedCoupon: updated,
  };
}

/**
 * Devuelve string tipo:
 *  - "Quedan 7 usos"
 *  - "Último uso disponible"
 *  - "Cupón agotado"
 *  - "♾ ilimitado"
 */
export function describeRemainingUses(coupon) {
  const maxAll = Number(coupon.max_uses_total);
  const used = Number(coupon.times_used);

  if (maxAll === 0) {
    return "♾ ilimitado";
  }

  const remaining = maxAll - used;
  if (remaining <= 0) return "Cupón agotado";
  if (remaining === 1) return "Último uso disponible";
  return `Quedan ${remaining} usos`;
}

/**
 * Desactiva un cupón (active = FALSE)
 */
export async function deactivateCoupon(code) {
  const db = getDB();
  const [result] = await db.execute(
    `UPDATE coupons
     SET active = FALSE
     WHERE code = ?`,
    [code.toUpperCase()]
  );
  return { ok: result.affectedRows > 0 };
}
