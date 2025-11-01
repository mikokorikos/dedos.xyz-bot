// interactions/handleModals.js
// Manejo de modales (formularios emergentes)
import { openPurchaseTicket, closeTicketWithTranscript } from "../services/ticketService.js";

/**
 * handleModalSubmit(client, interaction)
 */
export async function handleModalSubmit(client, interaction) {
  if (!interaction.isModalSubmit()) return;

  // Modal de compra de Robux
  if (interaction.customId === "purchase_modal") {
    const robloxUsername = interaction.fields.getTextInputValue(
      "roblox_username"
    );
    const robuxAmountRaw = interaction.fields.getTextInputValue(
      "robux_amount"
    );
    const couponCode = interaction.fields.getTextInputValue(
      "coupon_code"
    );

    const robuxAmount = parseInt(String(robuxAmountRaw).trim(), 10);
    if (!robuxAmount || robuxAmount <= 0) {
      await interaction.reply({
        content:
          "❌ Cantidad de Robux inválida. Por favor pon un número mayor que 0.",
        ephemeral: true,
      });
      return;
    }

    await openPurchaseTicket(interaction, {
      robloxUsername,
      robuxAmount,
      couponCode,
    });
    return;
  }

  // Modal de cierre de ticket
  if (interaction.customId === "modal_cierre") {
    const reason = interaction.fields.getTextInputValue("razon_cierre");
    await closeTicketWithTranscript(interaction, reason);
    return;
  }
}
