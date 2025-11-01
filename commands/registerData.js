// commands/registerData.js
// Definición de TODOS los slash commands
import { SlashCommandBuilder } from "discord.js";

export const commandsData = [
  new SlashCommandBuilder()
    .setName("robux")
    .setDescription(
      "Publica el panel oficial de compra de Robux en el canal oficial (solo staff)."
    ),

  new SlashCommandBuilder()
    .setName("ayuda")
    .setDescription(
      "Publica el panel oficial de ayuda / soporte en el canal oficial (solo staff)."
    ),

  new SlashCommandBuilder()
    .setName("precio")
    .setDescription("Calcula cuánto cuestan X Robux.")
    .addIntegerOption((opt) =>
      opt
        .setName("robux")
        .setDescription("Cantidad de Robux que quieres calcular")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("cuanto_mxn")
    .setDescription(
      "Con X MXN, ¿cuántos Robux puedes comprar? (cálculo aprox)"
    )
    .addNumberOption((opt) =>
      opt
        .setName("cantidad")
        .setDescription("Cantidad de MXN")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("cuanto_usd")
    .setDescription(
      "Con X USD, ¿cuántos Robux puedes comprar? (cálculo aprox)"
    )
    .addNumberOption((opt) =>
      opt
        .setName("cantidad")
        .setDescription("Cantidad de USD")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("crear-descuento")
    .setDescription("Crea un cupón de descuento (solo owner).")
    .addStringOption((opt) =>
      opt
        .setName("code")
        .setDescription("Código del cupón. Ej: HALLOWEEN15")
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName("tipo")
        .setDescription("Tipo de descuento")
        .addChoices(
          { name: "percent (porcentaje)", value: "percent" },
          { name: "fixed (MXN fijo)", value: "fixed" }
        )
        .setRequired(true)
    )
    .addNumberOption((opt) =>
      opt
        .setName("valor")
        .setDescription("Ej: 15 para 15%, o 25 para $25 MXN")
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName("expira")
        .setDescription("Fecha fin (YYYY-MM-DD HH:MM) o 'none'")
        .setRequired(false)
    )
    .addIntegerOption((opt) =>
      opt
        .setName("usosmax")
        .setDescription("Máximo de usos globales (0 = ilimitado)")
        .setRequired(false)
    )
    .addStringOption((opt) =>
      opt
        .setName("rol")
        .setDescription("Rol requerido (ID del rol) opcional")
        .setRequired(false)
    )
    .addStringOption((opt) =>
      opt
        .setName("usuarios")
        .setDescription(
          "IDs o @menciones separados por coma. Ej: 123, @alguien, <@999>"
        )
        .setRequired(false)
    )
    .addIntegerOption((opt) =>
      opt
        .setName("minrobux")
        .setDescription("Mínimo de Robux para aplicar el cupón")
        .setRequired(false)
    )
    .addStringOption((opt) =>
      opt
        .setName("limiteusuario")
        .setDescription("Uso por cuenta Roblox")
        .addChoices(
          {
            name: "once (1 vez / primera compra)",
            value: "once",
          },
          { name: "multi (reutilizable)", value: "multi" }
        )
        .setRequired(false)
    )
    .addStringOption((opt) =>
      opt
        .setName("motivo")
        .setDescription("Razón del descuento (promo, alianza, VIP, etc.)")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("desactivar-descuento")
    .setDescription("Desactiva un cupón (solo owner).")
    .addStringOption((opt) =>
      opt
        .setName("code")
        .setDescription("Código del cupón a desactivar")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("cupones-activos")
    .setDescription("Lista cupones activos (owner o staff)."),

  new SlashCommandBuilder()
    .setName("transcripcion")
    .setDescription(
      "Obtiene la transcripción de un ticket (solo staff, llega por DM)."
    )
    .addStringOption((opt) =>
      opt
        .setName("ticket")
        .setDescription("ID del ticket, ej: 007")
        .setRequired(true)
    ),
].map((c) => c.toJSON());
