// interactions/handleButtons.js
// Botones: abrir ticket, cambiar estado, cerrar ticket
import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from "discord.js";
import {
  openHelpTicket,
  handlePurchaseStatusUpdate,
  openPurchaseTicket,
  usePendingPurchaseConfirmation,
} from "../services/ticketService.js";
import {
  buildPurchaseConfirmationComponents,
  buildPurchaseConfirmationEmbed,
} from "../embeds/embeds.js";
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

  // Confirmar y abrir ticket de compra tras revisar precios
  if (id.startsWith("purchase_confirm:")) {
    const token = id.split(":")[1];
    const result = usePendingPurchaseConfirmation(token, interaction.user.id);

    if (result.status === "not_found") {
      await interaction.reply({
        content:
          "❌ Esta confirmación ya no existe. Vuelve a llenar el formulario de compra.",
        ephemeral: true,
      });
      return;
    }

    if (result.status === "unauthorized") {
      await interaction.reply({
        content:
          "⚠️ Solo la persona que generó la confirmación puede usarla.",
        ephemeral: true,
      });
      return;
    }

    if (result.status === "expired") {
      const expiredSummary = result.entry?.summary;
      const expiredEmbed = expiredSummary
        ? buildPurchaseConfirmationEmbed({
            ...expiredSummary,
            status: "expired",
          })
        : buildPurchaseConfirmationEmbed({
            robloxUsername: "—",
            robuxAmount: 0,
            priceBeforeMxn: 0,
            discountMxn: 0,
            finalPriceMxn: 0,
            couponCode: null,
            couponValid: null,
            couponMessage:
              "La confirmación expiró. Genera una nueva desde el panel de compra.",
            status: "expired",
          });
      await interaction.update({
        embeds: [expiredEmbed],
        components: buildPurchaseConfirmationComponents({ state: "disabled" }),
      });
      return;
    }

    const { data, summary, fraudReported } = result.entry;

    try {
      const ticketResult = await openPurchaseTicket(interaction, data, {
        skipReply: true,
        skipFraudAlert: fraudReported,
      });

      if (!ticketResult.success) {
        const alreadyOpenEmbed = buildPurchaseConfirmationEmbed({
          ...summary,
          status: "error",
          errorMessage:
            "Ya tienes un ticket abierto. Ciérralo antes de generar uno nuevo.",
        });

        await interaction.update({
          embeds: [alreadyOpenEmbed],
          components: buildPurchaseConfirmationComponents({ state: "disabled" }),
        });

        await interaction.followUp({
          content:
            "⚠️ Ya cuentas con un ticket activo. Utiliza ese canal o ciérralo para abrir otro.",
          ephemeral: true,
        });
        return;
      }

      const successEmbed = buildPurchaseConfirmationEmbed({
        ...summary,
        status: "confirmed",
        ticketId: ticketResult.ticketId,
      });

      await interaction.update({
        embeds: [successEmbed],
        components: buildPurchaseConfirmationComponents({ state: "disabled" }),
      });

      await interaction.followUp({
        content: `✅ Ticket #${ticketResult.ticketId} abierto en ${ticketResult.channel}`,
        ephemeral: true,
      });
    } catch (error) {
      console.error("Error al crear ticket desde confirmación:", error);
      const errorEmbed = buildPurchaseConfirmationEmbed({
        ...summary,
        status: "error",
        errorMessage:
          "Ocurrió un error al abrir tu ticket. Por favor inténtalo de nuevo.",
      });

      if (!interaction.replied && !interaction.deferred) {
        await interaction.update({
          embeds: [errorEmbed],
          components: buildPurchaseConfirmationComponents({ state: "disabled" }),
        });
      }

      await interaction.followUp({
        content:
          "❌ Ocurrió un error inesperado al abrir tu ticket. Contacta al staff.",
        ephemeral: true,
      });
    }
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
