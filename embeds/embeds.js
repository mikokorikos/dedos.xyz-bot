// embeds/embeds.js
// Todos los embeds bonitos en un solo lugar
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import {
  COLOR,
  baseAuthor,
  baseFooter,
  GIF_PATH,
  ROBLOX_GROUP_URL,
} from "../constants/ui.js";
import { config } from "../constants/config.js";
import {
  getPriceForRobux,
  formatPrice,
} from "../services/pricingService.js";

/**
 * Mapa de estatus para pedidos
 */
function statusToDisplay(st) {
  switch (st) {
    case "pendiente_pago":
      return "⌛ Pendiente de pago";
    case "pagado":
      return "💵 Pagado";
    case "en_entrega":
      return "📦 En entrega";
    case "entregado":
      return "✅ Entregado";
    case "cancelado":
      return "⛔ Cancelado";
    default:
      return st || "N/A";
  }
}

/**
 * Panel público de Robux
 * Calcula precio de 1000 Robux live
 */
export async function buildRobuxPanelEmbed() {
  const p1000 = getPriceForRobux(1000);
  const priceLine = `1000 Robux <:robux:1431425797603987569> = ${p1000.mxn.toFixed(
    2
  )} MXN (~$${p1000.usd.toFixed(2)} USD)`;

  return new EmbedBuilder()
    .setColor(COLOR)
    .setAuthor(baseAuthor())
    .setFooter(baseFooter())
    .setImage("attachment://dedosgift.gif")
    .setDescription(
      "# <:r1:1431564688142897202><:r2:1431564689669881949><:r3:1431564690978504796><:r4:1431566650351681596>"
    )
    .addFields(
      {
        name: "ADQUIERE TUS ROBUX",
        value:
          "<:Litecoin:1431422681764335678> **Litecoin** <:oxxoseeklogo:1431425535656984648> **Oxxo** <:paypal:1431423095092281406> **PayPal f&f** <:speiseeklogo:1431424447478370445> **Transferencias MX** <a:RedCard:1431426635386720399>",
      },
      {
        name: "Oferta destacada",
        value: priceLine,
        inline: true,
      },
      {
        name: "¿Cómo compro?",
        value:
          "Presiona el botón **🛒 Comprar Robux** y llena el formulario.\n" +
          "Si tienes cupón lo metes ahí.\n\n" +
          `🔗 Grupo Roblox: ${ROBLOX_GROUP_URL}`,
        inline: true,
      }
    );
}

/**
 * Panel de ayuda
 */
export function buildHelpPanelEmbed() {
  return new EmbedBuilder()
    .setColor(COLOR)
    .setAuthor(baseAuthor())
    .setFooter(baseFooter())
    .setImage("attachment://dedosgift.gif")
    .setTitle(
      "<:pinkheart:1431434986329997492> AYUDA <:yayyellow:1431437782450176091>"
    )
    .setDescription(
      "Hola, cualquier problema o duda que tengas por la más **mínima** no dudes en abrir ticket."
    )
    .addFields({
      name: "AQUÍ PUEDES",
      value:
        "<:verifiedgreen:1431453136265941132> Preguntar cualquier cosa\n" +
        "<:verifiedgreen:1431453136265941132> Hacer una alianza\n" +
        "<:verifiedgreen:1431453136265941132> Reportar servidor/personas/errores",
    });
}

/**
 * Embed inicial de ticket de compra
 */
export function buildPurchaseTicketEmbed({
  ticketId,
  userTag,
  robloxUsername,
  robuxAmount,
  priceNormalDisplay,
  priceFinalDisplay,
  couponCode,
  status,
}) {
  let desc =
    `Ticket **#${ticketId}**\n` +
    `Comprador: ${userTag}\n` +
    `Roblox: **${robloxUsername}**\n` +
    `Robux solicitados: **${robuxAmount}** <:robux:1431425797603987569>\n\n` +
    `💵 Precio normal: ${priceNormalDisplay}\n` +
    `🏷 Total con descuento: ${priceFinalDisplay}`;

  if (!couponCode) {
    desc =
      `Ticket **#${ticketId}**\n` +
      `Comprador: ${userTag}\n` +
      `Roblox: **${robloxUsername}**\n` +
      `Robux solicitados: **${robuxAmount}** <:robux:1431425797603987569>\n\n` +
      `💵 Total: ${priceFinalDisplay}`;
  }

  return new EmbedBuilder()
    .setColor(COLOR)
    .setAuthor(baseAuthor())
    .setFooter(baseFooter())
    .setTimestamp(new Date())
    .setImage("attachment://dedosgift.gif")
    .setTitle(`🎫 Ticket de Compra #${ticketId}`)
    .setDescription(desc)
    .addFields(
      couponCode
        ? {
            name: "Cupón aplicado",
            value: "```" + couponCode + "```",
            inline: true,
          }
        : {
            name: "Cupón aplicado",
            value: "Ninguno",
            inline: true,
          },
      {
        name: "Estado del pedido",
        value: statusToDisplay(status),
        inline: true,
      },
      {
        name: "Acciones staff",
        value:
          "💵 Marcar Pagado\n📦 Marcar En Entrega\n✅ Marcar Entregado\n🔒 Cerrar Ticket",
        inline: false,
      }
    );
}

/**
 * Embed de confirmación previa a abrir ticket de compra
 */
export function buildPurchaseConfirmationEmbed({
  robloxUsername,
  robuxAmount,
  priceBeforeMxn,
  discountMxn,
  finalPriceMxn,
  couponCode,
  couponValid,
  couponMessage,
  status = "preview",
  ticketId = null,
  errorMessage = null,
}) {
  const colorMap = {
    preview: COLOR,
    confirmed: 0x4caf50,
    expired: 0xffa000,
    error: 0xff5252,
  };

  const embed = new EmbedBuilder()
    .setColor(colorMap[status] || COLOR)
    .setAuthor(baseAuthor())
    .setFooter(baseFooter())
    .setTimestamp(new Date())
    .setTitle(
      status === "confirmed"
        ? "🎉 Ticket abierto correctamente"
        : status === "expired"
        ? "⌛ Confirmación expirada"
        : status === "error"
        ? "❌ Hubo un problema"
        : "🛒 Confirma tu compra"
    )
    .setDescription(
      `👤 Roblox: **${robloxUsername}**\n` +
        `💎 Robux solicitados: **${robuxAmount}** <:robux:1431425797603987569>`
    )
    .addFields(
      {
        name: "Precio original",
        value: formatPrice(priceBeforeMxn),
        inline: true,
      },
      {
        name: "Descuento aplicado",
        value:
          Number(discountMxn) > 0
            ? `-${formatPrice(discountMxn)}`
            : "Sin descuento",
        inline: true,
      },
      {
        name: "Precio final",
        value: formatPrice(finalPriceMxn),
        inline: true,
      }
    );

  if (couponCode) {
    const statusLine = couponValid
      ? `✅ Cupón **${couponCode}** aplicado.`
      : `❌ Cupón **${couponCode}** no válido.`;
    embed.addFields({
      name: "Estado del cupón",
      value: `${statusLine}\n${couponMessage || ""}`.trim(),
      inline: false,
    });
  } else {
    embed.addFields({
      name: "Estado del cupón",
      value: couponMessage || "No ingresaste ningún cupón.",
      inline: false,
    });
  }

  if (status === "preview") {
    embed.addFields({
      name: "Siguiente paso",
      value: "Presiona ✅ para abrir tu ticket y continuar con la compra.",
      inline: false,
    });
  }

  if (status === "confirmed" && ticketId) {
    embed.addFields({
      name: "Ticket creado",
      value: `Se abrió el ticket **#${ticketId}**. ¡Te atenderemos pronto!`,
      inline: false,
    });
  }

  if (status === "expired") {
    embed.addFields({
      name: "¿Qué hago ahora?",
      value: "Vuelve a llenar el formulario para generar una nueva confirmación.",
      inline: false,
    });
  }

  if (status === "error" && errorMessage) {
    embed.addFields({
      name: "Detalle",
      value: errorMessage,
      inline: false,
    });
  }

  return embed;
}

/**
 * Componentes (botón) para confirmar apertura del ticket
 */
export function buildPurchaseConfirmationComponents({ token, state = "pending" }) {
  if (state !== "pending" || !token) {
    return [];
  }

  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`purchase_confirm:${token}`)
        .setLabel("✅ Confirmar y abrir ticket")
        .setStyle(ButtonStyle.Success)
    ),
  ];
}

/**
 * Embed inicial de ticket de ayuda
 */
export function buildHelpTicketEmbed({ ticketId, userTag }) {
  return new EmbedBuilder()
    .setColor(COLOR)
    .setAuthor(baseAuthor())
    .setFooter(baseFooter())
    .setTimestamp(new Date())
    .setImage("attachment://dedosgift.gif")
    .setTitle(`❓ Ticket de Ayuda #${ticketId}`)
    .setDescription(
      `Hola ${userTag}, un miembro del staff te atenderá pronto para resolver tus dudas.\n\n` +
        `ID del Ticket: \`${ticketId}\``
    )
    .addFields({
      name: "Acciones staff",
      value: "🔒 Cerrar Ticket",
      inline: false,
    });
}

/**
 * Embed corto público cuando alguien usa cupón con éxito
 */
export function buildCouponPublicEmbedShort(data) {
  const beforeStr = formatPrice(data.price_before_mxn);
  const afterStr = formatPrice(data.price_after_mxn);

  return new EmbedBuilder()
    .setColor(COLOR)
    .setAuthor(baseAuthor())
    .setFooter(baseFooter())
    .setImage("attachment://dedosgift.gif")
    .setTitle("💸 DESCUENTO ACTIVADO")
    .setDescription(
      `<:bluestar:1431435163832815848> ${data.discordUserTag} ` +
        `acaba de comprar **${data.robux_amount} Robux** ` +
        `<:robux:1431425797603987569>.\n` +
        `👤 Roblox: **${data.roblox_username}**`
    )
    .addFields(
      {
        name: "Código usado",
        value: "```" + data.coupon_code + "```",
        inline: true,
      },
      {
        name: "Pagó",
        value: `**${afterStr}**\nante: ~~${beforeStr}~~`,
        inline: true,
      },
      {
        name: "Cupón",
        value:
          `📝 Motivo: ${data.coupon_meta.coupon_reason}\n` +
          `⏳ Termina: ${data.coupon_meta.expires_at_desc}\n` +
          `💠 Descuento: ${data.coupon_meta.discount_display}\n` +
          `📊 ${data.remaining_uses_text}\n\n` +
          `¿Quieres Robux con descuento?\n` +
          `Ve al canal oficial y usa "Comprar Robux".`,
        inline: false,
      }
    );
}

/**
 * Embed largo sólo staff con data técnica
 */
export function buildCouponLogEmbedFull(data) {
  const beforeStr = formatPrice(data.price_before_mxn);
  const afterStr = formatPrice(data.price_after_mxn);

  return new EmbedBuilder()
    .setColor(COLOR)
    .setAuthor(baseAuthor())
    .setFooter(baseFooter())
    .setImage("attachment://dedosgift.gif")
    .setTitle("💸 DESCUENTO APLICADO (LOG INTERNO)")
    .setDescription(
      `🎟 Ticket: #${data.ticket_id}\n` +
        `👤 Buyer: ${data.discordUserTag}\n` +
        `🤖 Roblox: ${data.roblox_username}\n` +
        `Robux comprados: **${data.robux_amount}**`
    )
    .addFields(
      {
        name: "Código",
        value: "```" + data.coupon_code + "```",
        inline: false,
      },
      {
        name: "Antes / Después",
        value:
          `Normal: ${beforeStr}\n` +
          `Final: ${afterStr}\n` +
          `Descuento MXN: -${Number(data.discount_mxn).toFixed(2)} MXN\n` +
          `Estado pedido: ${statusToDisplay(data.status)}`,
        inline: true,
      },
      {
        name: "Restricciones",
        value:
          `Scope: ${data.coupon_meta.scope_desc}\n` +
          `Uso por usuario: ${data.coupon_meta.per_user_limit_desc || "?"}\n` +
          `Expira: ${data.coupon_meta.expires_at_desc}\n` +
          `Mínimo Robux: ${data.coupon_meta.min_robux_required}\n` +
          `Visibilidad: ${data.coupon_meta.public_or_private_desc || "?"}\n` +
          `Motivo: ${data.coupon_meta.coupon_reason}\n` +
          `Descuento mostrado: ${data.coupon_meta.discount_display}\n` +
          `Disponibilidad: ${data.remaining_uses_text}`,
        inline: true,
      }
    );
}

/**
 * Embed para alerta de intento de abuso de cupón primera compra
 */
export function buildFraudAlertEmbed(f) {
  return new EmbedBuilder()
    .setColor(0xff0000)
    .setAuthor(baseAuthor())
    .setFooter(baseFooter())
    .setTitle("⚠ Posible abuso de cupón primera compra")
    .setDescription(
      `Usuario Discord: <@${f.discordUserId}> (${f.discordUserTag})\n` +
        `Roblox: **${f.robloxUsername}**\n` +
        `Intentó usar cupón: \`${f.couponCode}\`\n\n` +
        `Esta cuenta Roblox ya tiene historial de compra.\n`
    )
    .addFields(
      {
        name: "Compra previa detectada",
        value:
          `Ticket original: #${f.priorTicketId}\n` +
          `Comprador original: <@${f.priorBuyerDiscordId}>\n` +
          `Fecha: ${new Date(f.priorCreatedAt).toLocaleString("es-MX")}`,
        inline: false,
      }
    );
}

/**
 * Embed al cerrar ticket (compra o ayuda)
 */
export function buildTicketClosedEmbed({
  ticketId,
  ticketType,
  userTag,
  openedAt,
  closedAt,
  reason,
}) {
  const typeEmoji = ticketType === "ayuda" ? "❓" : "💰";
  const typeName = ticketType === "ayuda" ? "Ayuda" : "Compra";

  return new EmbedBuilder()
    .setColor(COLOR)
    .setAuthor(baseAuthor())
    .setFooter(baseFooter())
    .setTimestamp(new Date())
    .setImage("attachment://dedosgift.gif")
    .setTitle(`🔒 Ticket ${typeEmoji} ${typeName} #${ticketId} cerrado`)
    .addFields(
      {
        name: "Usuario",
        value: userTag,
        inline: true,
      },
      {
        name: "Abierto",
        value: new Date(openedAt).toLocaleString("es-MX"),
        inline: true,
      },
      {
        name: "Cerrado",
        value: new Date(closedAt).toLocaleString("es-MX"),
        inline: true,
      },
      {
        name: "Motivo",
        value: reason || "Sin motivo especificado",
        inline: false,
      }
    );
}

/**
 * Embed DM de bienvenida al unirse
 */
export async function buildWelcomeDMEmbed(guild) {
  const p1000 = getPriceForRobux(1000);
  const priceLine = `1000 Robux <:robux:1431425797603987569> = ${p1000.mxn.toFixed(
    2
  )} MXN (~$${p1000.usd.toFixed(2)} USD)`;

  return new EmbedBuilder()
    .setColor(COLOR)
    .setAuthor(baseAuthor())
    .setFooter(baseFooter())
    .setImage("attachment://dedosgift.gif")
    .setTitle("<:pinkheart:1431434986329997492> Gracias por unirte a dedos.xyz")
    .setDescription(
      `Contigo ya somos ${guild.memberCount} miembros.\n\n` +
        "Verifícate en el servidor para tener acceso completo."
    )
    .addFields(
      {
        name: "Promoción actual",
        value: priceLine,
      },
      {
        name: "Grupo Roblox",
        value: ROBLOX_GROUP_URL,
        inline: true,
      }
    );
}

/**
 * Embed DM después de verificar ✅
 */
export async function buildVerifiedDMEmbed(guild) {
  const p1000 = getPriceForRobux(1000);
  const priceLine = `1000 Robux <:robux:1431425797603987569> = ${p1000.mxn.toFixed(
    2
  )} MXN (~$${p1000.usd.toFixed(2)} USD)`;

  return new EmbedBuilder()
    .setColor(COLOR)
    .setAuthor(baseAuthor())
    .setFooter(baseFooter())
    .setImage("attachment://dedosgift.gif")
    .setTitle("✅ Verificación completa")
    .setDescription(
      "Ya tienes acceso al servidor.\nGracias por confiar en dedos.xyz 💜"
    )
    .addFields(
      {
        name: "Promoción actual",
        value: priceLine,
      },
      {
        name: "Grupo Roblox",
        value: ROBLOX_GROUP_URL,
        inline: true,
      }
    );
}

/**
 * Embed que se manda por DM cuando marcamos ENTREGADO ✅
 * (recibo)
 */
export function buildDeliveryReceiptEmbed({
  ticketId,
  robloxUsername,
  robuxAmount,
  finalPriceMxn,
}) {
  return new EmbedBuilder()
    .setColor(COLOR)
    .setAuthor(baseAuthor())
    .setFooter(baseFooter())
    .setTitle("✅ Pedido entregado")
    .setDescription(
      "Gracias por tu compra en dedos.xyz 💜\n" +
        "Guarda este mensaje como comprobante."
    )
    .addFields(
      {
        name: "Ticket",
        value: `#${ticketId}`,
        inline: true,
      },
      {
        name: "Roblox",
        value: robloxUsername,
        inline: true,
      },
      {
        name: "Robux entregados",
        value: `${robuxAmount} <:robux:1431425797603987569>`,
        inline: true,
      },
      {
        name: "Total pagado",
        value: formatPrice(finalPriceMxn),
        inline: true,
      }
    )
    .setTimestamp(new Date());
}

/**
 * Embed para cotizaciones /precio /cuanto_mxn /cuanto_usd
 */
export function buildPriceQuoteEmbed(data) {
  let title = "💰 Cotización";
  let desc = "";

  if (data.mode === "robux->precio") {
    desc =
      `**${data.robux} Robux** cuestan:\n` +
      `• ${data.mxn.toFixed(2)} MXN\n` +
      `• ~$${data.usd.toFixed(2)} USD`;
  } else if (data.mode === "mxn->robux") {
    desc =
      `Con **${data.mxn.toFixed(2)} MXN** (~$${data.usd.toFixed(
        2
      )} USD) puedes comprar aprox:\n` +
      `• **${data.robux} Robux** <:robux:1431425797603987569>`;
  } else if (data.mode === "usd->robux") {
    desc =
      `Con **$${data.usd.toFixed(2)} USD** (~${data.mxn.toFixed(
        2
      )} MXN) puedes comprar aprox:\n` +
      `• **${data.robux} Robux** <:robux:1431425797603987569>`;
  } else {
    desc = "No pude calcular.";
  }

  return new EmbedBuilder()
    .setColor(COLOR)
    .setAuthor(baseAuthor())
    .setFooter(baseFooter())
    .setImage("attachment://dedosgift.gif")
    .setTitle(title)
    .setDescription(desc);
}

/**
 * Embed listado de cupones activos (debug staff)
 */
export function buildCouponsListEmbed(coupons) {
  const embed = new EmbedBuilder()
    .setColor(COLOR)
    .setAuthor(baseAuthor())
    .setFooter(baseFooter())
    .setTitle("🎟 Cupones activos")
    .setDescription(
      "Detalle completo de cada cupón.\n" +
        "Así puedes ver por qué algo no aplica.\n\n" +
        "Campos: código / tipo / valor / rol / usuarios / mínimo Robux / límite x usuario / usos / expira / motivo."
    );

  if (!coupons.length) {
    embed.addFields({
      name: "Nada",
      value: "No hay cupones activos.",
    });
    return embed;
  }

  for (const c of coupons.slice(0, 10)) {
    // expiración
    const expiraDesc = c.expires_at
      ? new Date(c.expires_at).toLocaleString("es-MX")
      : "Sin expiración";

    // usos / quedan
    let usosDesc = "";
    if (Number(c.max_uses_total) > 0) {
      const remaining = Number(c.max_uses_total) - Number(c.times_used);
      usosDesc = `${c.times_used}/${c.max_uses_total} usos (quedan ${remaining < 0 ? 0 : remaining})`;
    } else {
      usosDesc = `${c.times_used} usos (ilimitado)`;
    }

    // tipo de descuento
    const descuentoDesc =
      c.discount_type === "percent"
        ? `${c.discount_value}% OFF`
        : `$${Number(c.discount_value).toFixed(2)} MXN OFF`;

    // rol requerido
    const rolDesc = c.role_required
      ? `<@&${c.role_required}>`
      : "Ninguno";

    // usuarios permitidos
    let usuariosDesc = "Todos";
    if (c.allowed_users) {
      try {
        const arr = JSON.parse(c.allowed_users);
        if (Array.isArray(arr) && arr.length > 0) {
          usuariosDesc = arr.map((u) => `<@${u}>`).join(", ");
        }
      } catch {
        /* ignore */
      }
    }

    // límite por cuenta
    const perUserDesc =
      c.per_user_limit === "multi"
        ? "Reutilizable"
        : c.per_user_limit === "custom"
        ? Number(c.per_user_limit_custom || 0) > 0
          ? `Hasta ${Number(c.per_user_limit_custom)} usos por usuario`
          : "Límite personalizado"
        : "1 vez / primera compra";

    // mínimo robux
    const minRobuxDesc =
      Number(c.min_robux) > 0 ? `${c.min_robux} Robux` : "Sin mínimo";

    // motivo
    const motivoDesc =
      c.reason && c.reason.trim() !== "" ? c.reason : "—";

    embed.addFields({
      name: `Código ${c.code}`,
      value:
        `💸 Descuento: ${descuentoDesc}\n` +
        `📦 Min. compra: ${minRobuxDesc}\n` +
        `👥 Rol requerido: ${rolDesc}\n` +
        `🔐 Usuarios permitidos: ${usuariosDesc}\n` +
        `♻ Límite por cuenta: ${perUserDesc}\n` +
        `⏳ Expira: ${expiraDesc}\n` +
        `📊 Usos: ${usosDesc}\n` +
        `📝 Motivo: ${motivoDesc}\n`,
      inline: false,
    });
  }

  return embed;
}

/**
 * Embed de reglas/verificación
 */
export function buildRulesEmbed() {
  return new EmbedBuilder()
    .setColor(COLOR)
    .setAuthor(baseAuthor())
    .setFooter(baseFooter())
    .setImage("attachment://dedosgift.gif")
    .setDescription(
      "# <:rules1:1431762573115658400><:reglas2:1431762571664560259><:reglas3:1431762570020257973><:reglas4:1431762568669827203>"
    )
    .addFields(
      {
        name: "<a:failed:1431763753287946446> No romper las siguientes normas",
        value:
          "dedos.xyz prohíbe enviar malware, pornografía en canales generales y enviar enlaces. " +
          "Todo lo demás está permitido excepto spam y otras normas lógicas.",
      },
      {
        name: "<:verifiedgreen:1431453136265941132> Verificación Obligatoria",
        value: `Reacciona con ✅ a este mensaje para verificarte y aceptar los <#${config.TOS_CHANNEL_ID}>.`,
      }
    );
}
