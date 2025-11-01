// interactions/handleButtons.js
// Botones: abrir ticket, cambiar estado, cerrar ticket
import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from "discord.js";
import { openHelpTicket, handlePurchaseStatusUpdate } from "../services/ticketService.js";
import { openPurchaseTicket } from "../services/ticketService.js";
import { isStaff } from "../services/permissions.js";

/**
 * handleButtonInteraction(client, interaction)
 */
export async function handleButtonInteraction(client, interaction) {
  if (!interaction.isButton()) return;

  const id = interaction.customId;

  // Abrir ticket de compra => lanzar modal
  if (id === "abrir_ticket_compra") {
    const modal = new ModalBuilder()
      .setCustomId("purchase_modal")
      .setTitle("Comprar Robux");

    const robloxInput = new TextInputBuilder()
      .setCustomId("roblox_username")
      .setLabel("Usuario de Roblox")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("Tu usuario EXACTO de Roblox")
      .setRequired(true);

    const robuxAmount = new TextInputBuilder()
      .setCustomId("robux_amount")
      .setLabel("Robux a comprar")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("Ejemplo: 1000")
      .setRequired(true);

    const couponInput = new TextInputBuilder()
      .setCustomId("coupon_code")
      .setLabel("Cupón (opcional)")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("Si tienes cupón escríbelo aquí")
      .setRequired(false);

    const row1 = new ActionRowBuilder().addComponents(robloxInput);
    const row2 = new ActionRowBuilder().addComponents(robuxAmount);
    const row3 = new ActionRowBuilder().addComponents(couponInput);

    modal.addComponents(row1, row2, row3);

    await interaction.showModal(modal);
    return;
  }

  // Abrir ticket de ayuda => directo
  if (id === "abrir_ticket_ayuda") {
    await openHelpTicket(interaction);
    return;
  }

  // Cerrar ticket: sólo staff -> mostrar modal de razón
  if (id === "cerrar_ticket") {
    if (!isStaff(interaction.member)) {
      await interaction.reply({
        content: "❌ Solo el staff puede cerrar tickets.",
        ephemeral: true,
      });
      return;
    }

    const modal = new ModalBuilder()
      .setCustomId("modal_cierre")
      .setTitle("Cerrar ticket");

    const input = new TextInputBuilder()
      .setCustomId("razon_cierre")
      .setLabel("Motivo del cierre")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setPlaceholder("Ej: Compra completada / Cancelado por usuario / etc.");

    const row = new ActionRowBuilder().addComponents(input);
    modal.addComponents(row);

    await interaction.showModal(modal);
    return;
  }

  // Estados de compra
  if (id === "purchase_mark_pagado") {
    await handlePurchaseStatusUpdate(interaction, "pagado");
    return;
  }

  if (id === "purchase_mark_en_entrega") {
    await handlePurchaseStatusUpdate(interaction, "en_entrega");
    return;
  }

  if (id === "purchase_mark_entregado") {
    await handlePurchaseStatusUpdate(interaction, "entregado");
    return;
  }
}
