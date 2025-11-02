import { AttachmentBuilder } from "discord.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const GIF_PATH = path.join(__dirname, "../dedosgift.gif");

export async function sendEmbed(
  target,
  builderFn,
  builderArgs = undefined,
  sendOptions = {}
) {
  const { method, spreadArgs = false, ...restOptions } = sendOptions;
  const argsArray =
    builderArgs === undefined
      ? []
      : Array.isArray(builderArgs) && spreadArgs
      ? builderArgs
      : [builderArgs];

  const { embed } = await builderFn(...argsArray);
  const gif = new AttachmentBuilder(GIF_PATH, { name: "dedosgift.gif" });
  const additionalFiles = restOptions.files ?? [];

  const options = {
    ...restOptions,
    embeds: [embed],
    files: [...additionalFiles, gif],
  };

  const resolvedMethod =
    method ??
    (typeof target.send === "function"
      ? "send"
      : typeof target.reply === "function"
      ? "reply"
      : undefined);

  if (!resolvedMethod || typeof target[resolvedMethod] !== "function") {
    throw new Error("sendEmbed: target does not support sending messages");
  }

  return target[resolvedMethod](options);
}
