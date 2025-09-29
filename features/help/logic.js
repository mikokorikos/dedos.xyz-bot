import { EmbedBuilder } from 'discord.js';
import { COMMAND_PREFIX } from '../../config/constants.js';
import { withBranding } from '../../utils/branding.js';
import { sendCommandReply } from '../../utils/respond.js';

function sortCommands(commands) {
  return [...commands].sort((a, b) => a.localeCompare(b));
}

function formatList(items) {
  return items.map((item) => `- ${item}`).join('\n');
}

export async function handleHelpCommand(ctx) {
  const isSlash =
    'isChatInputCommand' in ctx && typeof ctx.isChatInputCommand === 'function' && ctx.isChatInputCommand();
  const { FEATURES } = await import('../index.js');

  const slashCommands = new Set();
  const prefixCommands = new Set();

  for (const feature of FEATURES) {
    for (const command of feature.commands ?? []) {
      if (command.type === 'slash') {
        slashCommands.add(`/${command.name}`);
      }
      if (command.type === 'prefix') {
        const name = command.name.startsWith(COMMAND_PREFIX)
          ? command.name
          : `${COMMAND_PREFIX}${command.name}`;
        prefixCommands.add(name);
      }
    }
  }

  const sortedSlash = sortCommands(slashCommands);
  const sortedPrefix = sortCommands(prefixCommands);

  const embed = new EmbedBuilder()
    .setTitle('Guia de comandos de Dedos Shop')
    .setDescription(
      `Usa los comandos desde el menu de Discord o con el prefijo \`${COMMAND_PREFIX}\`.
Los comandos como \`/mm\` tienen subcomandos; escribe el nombre y revisa las opciones que aparecen.`
    );

  if (sortedSlash.length) {
    embed.addFields({ name: 'Slash', value: formatList(sortedSlash) });
  }

  if (sortedPrefix.length) {
    embed.addFields({ name: 'Prefijo', value: formatList(sortedPrefix) });
  }

  embed.addFields({
    name: 'Consejos',
    value:
      'Si un comando slash no responde, prueba tambien su version con prefijo. Usa `;help` en cualquier canal para volver a abrir esta guia.',
  });

  const payload = withBranding(embed);
  await sendCommandReply(ctx, payload, { ephemeral: isSlash });
}
