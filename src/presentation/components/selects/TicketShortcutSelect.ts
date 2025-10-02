// =============================================================================
// RUTA: src/presentation/components/selects/TicketShortcutSelect.ts
// =============================================================================

import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  type StringSelectMenuInteraction,
} from 'discord.js';

import { GeneralTicketTypeSchema } from '@/application/dto/ticket.dto';
import { registerSelectHandler } from '@/presentation/components/registry';
import { embedFactory } from '@/presentation/embeds/EmbedFactory';

const CUSTOM_ID = 'ticket-shortcuts';

const OPTIONS = [
  { label: 'Comprar artículo', value: 'BUY', description: 'Publica una compra de ítems o servicios.' },
  { label: 'Vender artículo', value: 'SELL', description: 'Ofrece ítems o servicios a la venta.' },
  { label: 'Comprar/Vender Robux', value: 'ROBUX', description: 'Negocia Robux con métodos verificados.' },
  { label: 'Nitro', value: 'NITRO', description: 'Solicita o vende suscripciones de Discord Nitro.' },
  { label: 'Decor / Builds', value: 'DECOR', description: 'Encarga decoraciones, builds o diseños.' },
] as const;

export const TicketShortcutSelect = {
  build(): ActionRowBuilder<StringSelectMenuBuilder> {
    const select = new StringSelectMenuBuilder()
      .setCustomId(CUSTOM_ID)
      .setPlaceholder('Selecciona el tipo de ticket que necesitas')
      .addOptions(OPTIONS.map((option) => ({
        label: option.label,
        value: option.value,
        description: option.description,
      })));

    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
  },

  async handle(interaction: StringSelectMenuInteraction): Promise<void> {
    const [rawType] = interaction.values;
    const type = GeneralTicketTypeSchema.parse(rawType);
    const command = `/ticket open type:${type.toLowerCase()}`;

    await interaction.reply({
      embeds: [
        embedFactory.info({
          title: 'Atajo de ticket',
          description:
            `Utiliza el comando ${command} para iniciar la solicitud. ` +
            'Añade los detalles del artículo, presupuesto y contraparte en las opciones solicitadas.',
        }),
      ],
      ephemeral: true,
    });
  },
};

registerSelectHandler(CUSTOM_ID, async (interaction) => {
  await TicketShortcutSelect.handle(interaction);
});
