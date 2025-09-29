import type { APIEmbedField } from 'discord.js';
import { EmbedBuilder } from 'discord.js';

const DEFAULT_COLOR = 0xff7b2b;
const ERROR_COLOR = 0xeb4d4b;
const SUCCESS_COLOR = 0x2ecc71;
const MAX_FIELD_LENGTH = 1024;
const MAX_DESCRIPTION_LENGTH = 4096;

interface BaseEmbedData {
  readonly title?: string;
  readonly description: string;
  readonly footer?: string;
  readonly fields?: ReadonlyArray<APIEmbedField>;
}

interface SuccessEmbedData extends BaseEmbedData {
  readonly timestamp?: Date;
}

interface ErrorEmbedData extends BaseEmbedData {
  readonly reference?: string;
}

interface MiddlemanPanelData {
  readonly ticketId: number | string;
  readonly buyerTag: string;
  readonly sellerTag: string;
  readonly status: string;
  readonly notes?: string;
}

interface TicketEmbedData {
  readonly ticketId: number | string;
  readonly type: string;
  readonly ownerTag: string;
  readonly description: string;
}

interface ReviewRequestData {
  readonly middlemanTag: string;
  readonly tradeSummary: string;
}

const truncate = (value: string, maxLength: number) =>
  value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;

const sanitizeFields = (fields: ReadonlyArray<APIEmbedField> = []) =>
  fields.slice(0, 25).map((field) => ({
    name: truncate(field.name, MAX_FIELD_LENGTH),
    value: truncate(field.value, MAX_FIELD_LENGTH),
    inline: field.inline ?? false,
  }));

export class EmbedFactory {
  public success(data: SuccessEmbedData): EmbedBuilder {
    return this.buildEmbed({
      color: SUCCESS_COLOR,
      title: data.title ?? 'Operación exitosa',
      description: truncate(data.description, MAX_DESCRIPTION_LENGTH),
      footer: data.footer,
      fields: sanitizeFields(data.fields),
      timestamp: data.timestamp ?? new Date(),
    });
  }

  public error(data: ErrorEmbedData): EmbedBuilder {
    const description = data.reference
      ? `${data.description}\n\nCódigo de referencia: \`${data.reference}\``
      : data.description;

    return this.buildEmbed({
      color: ERROR_COLOR,
      title: data.title ?? 'Ha ocurrido un problema',
      description: truncate(description, MAX_DESCRIPTION_LENGTH),
      footer: data.footer,
      fields: sanitizeFields(data.fields),
    });
  }

  public middlemanPanel(data: MiddlemanPanelData): EmbedBuilder {
    return this.buildEmbed({
      color: DEFAULT_COLOR,
      title: `Panel Middleman #${data.ticketId}`,
      description: truncate(data.notes ?? 'Gestiona la transacción desde este panel.', MAX_DESCRIPTION_LENGTH),
      fields: sanitizeFields([
        { name: 'Comprador', value: data.buyerTag, inline: true },
        { name: 'Vendedor', value: data.sellerTag, inline: true },
        { name: 'Estado', value: data.status, inline: true },
      ]),
    });
  }

  public ticketCreated(data: TicketEmbedData): EmbedBuilder {
    return this.buildEmbed({
      color: DEFAULT_COLOR,
      title: `Ticket #${data.ticketId} creado`,
      description: truncate(data.description, MAX_DESCRIPTION_LENGTH),
      fields: sanitizeFields([
        { name: 'Tipo', value: data.type, inline: true },
        { name: 'Propietario', value: data.ownerTag, inline: true },
      ]),
    });
  }

  public reviewRequest(data: ReviewRequestData): EmbedBuilder {
    return this.buildEmbed({
      color: DEFAULT_COLOR,
      title: '¿Cómo fue tu experiencia?',
      description: truncate(data.tradeSummary, MAX_DESCRIPTION_LENGTH),
      fields: sanitizeFields([
        { name: 'Middleman', value: data.middlemanTag, inline: true },
      ]),
    });
  }

  private buildEmbed(options: {
    readonly color: number;
    readonly title: string;
    readonly description: string;
    readonly footer?: string;
    readonly fields?: ReadonlyArray<APIEmbedField>;
    readonly timestamp?: Date;
  }): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(options.color)
      .setTitle(truncate(options.title, 256))
      .setDescription(truncate(options.description, MAX_DESCRIPTION_LENGTH));

    if (options.fields && options.fields.length > 0) {
      embed.setFields(options.fields);
    }

    if (options.footer) {
      embed.setFooter({ text: truncate(options.footer, 2048) });
    }

    if (options.timestamp) {
      embed.setTimestamp(options.timestamp);
    }

    return embed;
  }
}

export const embedFactory = new EmbedFactory();
