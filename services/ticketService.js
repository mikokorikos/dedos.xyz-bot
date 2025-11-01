// services/ticketService.js
// Crear tickets, actualizar estados, cerrar y transcript
import fs from "fs/promises";
import path from "path";
import * as transcript from "discord-html-transcripts";
import {
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";

import { config } from "../constants/config.js";
import { GIF_PATH } from "../constants/ui.js";
import { getDB } from "./db.js";
import { isStaff } from "./permissions.js";
import {
  getPriceForRobux,
  formatPrice,
} from "./pricingService.js";
import {
  validateCoupon,
  registerCouponUse,
} from "./couponService.js";
import {
  createPurchaseRecord,
  getPurchaseByTicket,
  updatePurchaseStatus,
  updatePurchaseStatusMessageId,
} from "./purchaseService.js";
import {
  buildPurchaseTicketEmbed,
  buildHelpTicketEmbed,
  buildCouponPublicEmbedShort,
  buildCouponLogEmbedFull,
  buildFraudAlertEmbed,
  buildTicketClosedEmbed,
  buildDeliveryReceiptEmbed,
} from "../embeds/embeds.js";

/**
 * Helper para construir los botones de staff en tickets de compra
 */
function buildPurchaseButtonsRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("purchase_mark_pagado")
      .setLabel("💵 Pagado")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("purchase_mark_en_entrega")
      .setLabel("📦 En Entrega")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("purchase_mark_entregado")
      .setLabel("✅ Entregado")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("cerrar_ticket")
      .setLabel("🔒 Cerrar Ticket")
      .setStyle(ButtonStyle.Danger)
  );
}

/**
 * Helper para botones de ticket de ayuda
 */
function buildHelpButtonsRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("cerrar_ticket")
      .setLabel("🔒 Cerrar Ticket")
      .setStyle(ButtonStyle.Danger)
  );
}

/**
 * Crea un canal privado tipo "compra" (pedido de Robux)
 * Recibe data del modal de compra.
 * Hace pricing, valida cupón, abre canal y loguea todo.
 */
export async function openPurchaseTicket(interaction, data) {
  const guild = interaction.guild;
  const user = interaction.user;
  const member = interaction.member;
  const db = getDB();

  // Ver si ya tiene un ticket abierto
  const [existing] = await db.execute(
    `SELECT * FROM tickets
     WHERE user_id = ?
       AND closed_at IS NULL
     LIMIT 1`,
    [user.id]
  );
  if (existing.length > 0) {
    await interaction.reply({
      content:
        "⚠️ Ya tienes un ticket abierto. Por favor ciérralo antes de abrir otro.",
      ephemeral: true,
    });
    return;
  }

  // Generar ID nuevo
  const [countRows] = await db.execute(
    "SELECT COUNT(*) as total FROM tickets"
  );
  const ticketId = String(countRows[0].total + 1).padStart(3, "0");

  // Calcular precio base
  const basePrice = getPriceForRobux(data.robuxAmount);
  const priceBeforeMxn = basePrice.mxn;

  // Validar cupón (si existe)
  const couponResult = await validateCoupon({
    couponCode: data.couponCode,
    robuxAmount: data.robuxAmount,
    robloxUsername: data.robloxUsername,
    discordMember: member,
    discordUserId: user.id,
    priceBeforeMxn,
  });

  // Anti-fraude ALERTA si intentó usar cupón de primera compra y no aplica
  if (!couponResult.ok && couponResult.fraudFlag && couponResult.fraudInfo) {
    const fraudEmbed = buildFraudAlertEmbed({
      discordUserTag: user.tag,
      discordUserId: user.id,
      robloxUsername: couponResult.fraudInfo.robloxUsername,
      couponCode: couponResult.fraudInfo.couponCode,
      priorTicketId: couponResult.fraudInfo.priorTicketId,
      priorBuyerDiscordId: couponResult.fraudInfo.priorBuyerDiscordId,
      priorCreatedAt: couponResult.fraudInfo.priorCreatedAt,
    });

    const fraudChan = interaction.client.channels.cache.get(
      config.STAFF_LOG_CHANNEL_ID
    );
    if (fraudChan) {
      await fraudChan.send({
        embeds: [fraudEmbed],
      });
    }
  }

  // Si cupón no válido => seguimos SIN cupón
  const effectiveCoupon = couponResult.ok
    ? couponResult.couponUsed
    : null;
  const finalPriceMxn = couponResult.ok
    ? couponResult.finalPriceMxn
    : priceBeforeMxn;
  const discountMxn = couponResult.ok
    ? couponResult.discountMxn
    : 0;

  // Crear canal privado
  const channelName = `ticket-${ticketId}-${user.username}`;
  const overwrites = [
    {
      id: guild.roles.everyone,
      deny: [
        PermissionFlagsBits.ViewChannel,
      ],
    },
    {
      id: user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
  ];

  // Staff roles
  const staffRoles = config.TICKET_STAFF_ROLE_IDS.split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  for (const rId of staffRoles) {
    overwrites.push({
      id: rId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    });
  }

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: config.TICKET_CATEGORY_ID || null,
    permissionOverwrites: overwrites,
  });

  // Guardar ticket en DB
  await db.execute(
    `INSERT INTO tickets
      (ticket_id, ticket_type, user_id, username, channel_id)
     VALUES (?, 'compra', ?, ?, ?)`,
    [ticketId, user.id, user.tag, channel.id]
  );

  // Guardar compra inicial en DB
  await createPurchaseRecord({
    ticketId,
    buyerDiscordId: user.id,
    robloxUsername: data.robloxUsername,
    robuxAmount: data.robuxAmount,
    priceBeforeMxn,
    couponCode: effectiveCoupon ? effectiveCoupon.code : null,
    discountMxn,
    finalPriceMxn,
  });

  // Embed en el canal del ticket
  const priceNormalDisplay = formatPrice(priceBeforeMxn);
  const priceFinalDisplay = formatPrice(finalPriceMxn);
  const purchaseEmbed = buildPurchaseTicketEmbed({
    ticketId,
    userTag: user.tag,
    robloxUsername: data.robloxUsername,
    robuxAmount: data.robuxAmount,
    priceNormalDisplay,
    priceFinalDisplay,
    couponCode: effectiveCoupon ? effectiveCoupon.code : null,
    status: "pendiente_pago",
  });

  const row = buildPurchaseButtonsRow();

  const staffPing =
    staffRoles.map((id) => `<@&${id}>`).join(" ") || "@here";

  const sentMsg = await channel.send({
    content: `${user} | Staff: ${staffPing}`,
    embeds: [purchaseEmbed],
    files: [GIF_PATH],
    components: [row],
  });

  // Guardar status_message_id
  await updatePurchaseStatusMessageId(ticketId, sentMsg.id);

  // Mandar respuesta ephemeral al que pidió
  await interaction.reply({
    content: `✅ Ticket #${ticketId} abierto en ${channel}`,
    ephemeral: true,
  });

  console.log(
    `🎫 ${user.tag} abrió ticket de compra #${ticketId} (${data.robuxAmount} Robux)`
  );

  // Si el cupón fue válido => registrar uso y mandar logs público+staff
  if (effectiveCoupon) {
    const { remainingUsesText } = await registerCouponUse({
      coupon: effectiveCoupon,
      robloxUsername: data.robloxUsername,
      discordUserId: user.id,
      ticketId,
    });

    // Build embed público
    const pubEmbed = buildCouponPublicEmbedShort({
      discordUserTag: user.tag,
      roblox_username: data.robloxUsername,
      robux_amount: data.robuxAmount,
      coupon_code: effectiveCoupon.code,
      price_before_mxn: priceBeforeMxn,
      price_after_mxn: finalPriceMxn,
      coupon_meta: couponResult.meta,
      remaining_uses_text: remainingUsesText,
    });

    const staffEmbed = buildCouponLogEmbedFull({
      discordUserTag: user.tag,
      roblox_username: data.robloxUsername,
      ticket_id: ticketId,
      robux_amount: data.robuxAmount,
      price_before_mxn: priceBeforeMxn,
      price_after_mxn: finalPriceMxn,
      discount_mxn: discountMxn,
      coupon_code: effectiveCoupon.code,
      coupon_meta: couponResult.meta,
      status: "pendiente_pago",
      remaining_uses_text: remainingUsesText,
    });

    const publicChan = interaction.client.channels.cache.get(
      config.PUBLIC_LOG_CHANNEL_ID
    );
    if (publicChan) {
      await publicChan.send({
        embeds: [pubEmbed],
        files: [GIF_PATH],
      });
    }

    const staffChan = interaction.client.channels.cache.get(
      config.STAFF_LOG_CHANNEL_ID
    );
    if (staffChan) {
      await staffChan.send({
        embeds: [staffEmbed],
        files: [GIF_PATH],
      });
    }
  }
}

/**
 * Crea un canal privado tipo "ayuda"
 */
export async function openHelpTicket(interaction) {
  const guild = interaction.guild;
  const user = interaction.user;
  const db = getDB();

  // Ver si ya tiene ticket abierto
  const [existing] = await db.execute(
    `SELECT *
     FROM tickets
     WHERE user_id = ?
       AND closed_at IS NULL
     LIMIT 1`,
    [user.id]
  );
  if (existing.length > 0) {
    await interaction.reply({
      content:
        "⚠️ Ya tienes un ticket abierto. Por favor ciérralo antes de abrir otro.",
      ephemeral: true,
    });
    return;
  }

  // Nuevo ID
  const [countRows] = await db.execute(
    "SELECT COUNT(*) as total FROM tickets"
  );
  const ticketId = String(countRows[0].total + 1).padStart(3, "0");

  // Crear canal
  const channelName = `ayuda-${ticketId}-${user.username}`;
  const overwrites = [
    {
      id: guild.roles.everyone,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
  ];

  const staffRoles = config.TICKET_STAFF_ROLE_IDS.split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  for (const rId of staffRoles) {
    overwrites.push({
      id: rId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    });
  }

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: config.TICKET_CATEGORY_ID || null,
    permissionOverwrites: overwrites,
  });

  // Guardar ticket
  await db.execute(
    `INSERT INTO tickets
      (ticket_id, ticket_type, user_id, username, channel_id)
     VALUES (?, 'ayuda', ?, ?, ?)`,
    [ticketId, user.id, user.tag, channel.id]
  );

  const helpEmbed = buildHelpTicketEmbed({
    ticketId,
    userTag: user.tag,
  });

  const row = buildHelpButtonsRow();

  const staffPing =
    staffRoles.map((id) => `<@&${id}>`).join(" ") || "@here";

  await channel.send({
    content: `${user} | Staff: ${staffPing}`,
    embeds: [helpEmbed],
    files: [GIF_PATH],
    components: [row],
  });

  await interaction.reply({
    content: `✅ Ticket #${ticketId} abierto en ${channel}`,
    ephemeral: true,
  });

  console.log(`🎫 ${user.tag} abrió ticket de ayuda #${ticketId}`);
}

/**
 * Staff actualiza estado de compra (pagado, en_entrega, entregado)
 * - Edita el embed en el canal
 * - Si es entregado, DM al cliente con recibo
 */
export async function handlePurchaseStatusUpdate(interaction, newStatus) {
  // Sólo staff
  if (!isStaff(interaction.member)) {
    await interaction.reply({
      content: "❌ Solo staff.",
      ephemeral: true,
    });
    return;
  }

  const channel = interaction.channel;
  if (!channel) {
    await interaction.reply({
      content: "❌ Canal inválido.",
      ephemeral: true,
    });
    return;
  }

  const db = getDB();
  // Buscar ticket por channel_id
  const [rows] = await db.execute(
    `SELECT *
     FROM tickets
     WHERE channel_id = ?
     LIMIT 1`,
    [channel.id]
  );
  if (!rows.length) {
    await interaction.reply({
      content: "❌ No se encontró ticket en la base.",
      ephemeral: true,
    });
    return;
  }
  const ticket = rows[0];
  if (ticket.ticket_type !== "compra") {
    await interaction.reply({
      content: "❌ Este ticket no es de compra.",
      ephemeral: true,
    });
    return;
  }

  // Actualizar estado en purchases
  const purchaseRow = await updatePurchaseStatus(
    ticket.ticket_id,
    newStatus
  );

  // Reconstruir embed con estado nuevo
  const priceNormalDisplay = formatPrice(purchaseRow.price_before);
  const priceFinalDisplay = formatPrice(purchaseRow.price_after);

  const embed = buildPurchaseTicketEmbed({
    ticketId: ticket.ticket_id,
    userTag: ticket.username,
    robloxUsername: purchaseRow.roblox_username,
    robuxAmount: purchaseRow.robux_amount,
    priceNormalDisplay,
    priceFinalDisplay,
    couponCode: purchaseRow.coupon_code,
    status: purchaseRow.status,
  });

  // Editar el mensaje original
  try {
    const msg = await channel.messages.fetch(
      purchaseRow.status_message_id
    );
    await msg.edit({
      embeds: [embed],
      components: [buildPurchaseButtonsRow()],
    });
  } catch (err) {
    console.error("No se pudo editar el mensaje de estado:", err);
  }

  // Si marcó ENTREGADO => mandar recibo por DM al comprador
  if (newStatus === "entregado") {
    try {
      const buyer = await interaction.client.users.fetch(
        purchaseRow.buyer_discord_id
      );
      const receiptEmbed = buildDeliveryReceiptEmbed({
        ticketId: ticket.ticket_id,
        robloxUsername: purchaseRow.roblox_username,
        robuxAmount: purchaseRow.robux_amount,
        finalPriceMxn: purchaseRow.price_after,
      });

      await buyer.send({
        embeds: [receiptEmbed],
        files: [GIF_PATH],
      });
    } catch (dmErr) {
      console.warn(
        "❌ No se pudo mandar el recibo al comprador:",
        dmErr.message
      );
    }
  }

  await interaction.reply({
    content: `✅ Estado actualizado a "${newStatus}"`,
    ephemeral: true,
  });
}

/**
 * Cerrar ticket:
 * - staff da razón
 * - guardamos transcript html en /transcripts
 * - marcamos closed_at
 * - DM al usuario con transcript
 * - borramos canal tras unos segundos
 */
export async function closeTicketWithTranscript(
  interaction,
  reason
) {
  // Sólo staff
  if (!isStaff(interaction.member)) {
    await interaction.reply({
      content: "❌ Solo staff puede cerrar tickets.",
      ephemeral: true,
    });
    return;
  }

  const channel = interaction.channel;
  if (!channel) {
    await interaction.reply({
      content: "❌ Canal inválido.",
      ephemeral: true,
    });
    return;
  }

  const db = getDB();
  // Buscar ticket por channel_id
  const [rows] = await db.execute(
    `SELECT *
     FROM tickets
     WHERE channel_id = ?
     LIMIT 1`,
    [channel.id]
  );
  if (!rows.length) {
    await interaction.reply({
      content: "⚠️ No se encontró el ticket en la base.",
      ephemeral: true,
    });
    return;
  }
  const ticket = rows[0];

  // Buscar también purchase si aplica
  const purchaseRow = await getPurchaseByTicket(ticket.ticket_id);

  // Crear transcript
  const fileName = `ticket-${ticket.ticket_id}.html`;
  const filePath = path.join(config.TRANSCRIPTS_DIR, fileName);

  const transcriptAttachment = await transcript.createTranscript(
    channel,
    {
      limit: -1,
      returnBuffer: false,
      fileName,
      saveImages: true,
      poweredBy: false,
    }
  );

  const buffer = transcriptAttachment.attachment;
  await fs.writeFile(filePath, buffer);

  // Actualizar DB tickets
  await db.execute(
    `UPDATE tickets
     SET closed_at = NOW(),
         reason = ?,
         has_transcript = TRUE
     WHERE channel_id = ?`,
    [reason, channel.id]
  );

  // Embed de cierre dentro del canal
  const cierreEmbed = buildTicketClosedEmbed({
    ticketId: ticket.ticket_id,
    ticketType: ticket.ticket_type,
    userTag: ticket.username,
    openedAt: ticket.opened_at,
    closedAt: new Date(),
    reason,
  });

  await channel.send({
    embeds: [cierreEmbed],
    files: [GIF_PATH],
  });

  // DM al autor original con la transcripción
  try {
    const user = await interaction.client.users.fetch(ticket.user_id);

    const dmEmbed = buildTicketClosedEmbed({
      ticketId: ticket.ticket_id,
      ticketType: ticket.ticket_type,
      userTag: ticket.username,
      openedAt: ticket.opened_at,
      closedAt: new Date(),
      reason,
    });

    await user.send({
      embeds: [dmEmbed],
      files: [GIF_PATH, filePath],
    });
  } catch (dmError) {
    console.warn("❌ No se pudo enviar DM al usuario:", dmError.message);
  }

  await interaction.reply({
    content: `✅ Ticket #${ticket.ticket_id} cerrado y guardado.`,
    ephemeral: true,
  });

  console.log(
    `🔒 ${interaction.user.tag} cerró ticket #${ticket.ticket_id} (${ticket.ticket_type}) - Razón: ${reason}`
  );

  // Borrar el canal después de un rato
  setTimeout(() => {
    channel.delete("Ticket cerrado").catch(console.error);
  }, 10_000);
}

/**
 * Staff: obtener transcript por ID (slash /transcripcion o prefijo ;transcripcion)
 * Le mandamos la transcripción al que pidió, por DM.
 */
export async function sendTranscriptById(
  client,
  requesterUser,
  ticketNumericId
) {
  const db = getDB();

  const id = String(ticketNumericId).padStart(3, "0");

  const [rows] = await db.execute(
    `SELECT *
     FROM tickets
     WHERE ticket_id = ?
     LIMIT 1`,
    [id]
  );
  if (!rows.length) {
    throw new Error("No existe ese ticket en DB.");
  }
  const ticket = rows[0];

  if (!ticket.has_transcript) {
    throw new Error("Ese ticket aún no tiene transcripción guardada.");
  }

  const filePath = path.join(
    config.TRANSCRIPTS_DIR,
    `ticket-${ticket.ticket_id}.html`
  );

  try {
    await fs.access(filePath);
  } catch {
    throw new Error("El archivo de transcripción no se encontró en el servidor.");
  }

  const cierreEmbed = buildTicketClosedEmbed({
    ticketId: ticket.ticket_id,
    ticketType: ticket.ticket_type,
    userTag: ticket.username,
    openedAt: ticket.opened_at,
    closedAt: ticket.closed_at || new Date(),
    reason: ticket.reason || "Sin motivo especificado",
  });

  await requesterUser.send({
    embeds: [cierreEmbed],
    files: [filePath],
  });

  console.log(
    `📄 ${requesterUser.tag} descargó transcripción del ticket #${ticket.ticket_id} (${ticket.ticket_type})`
  );
}
