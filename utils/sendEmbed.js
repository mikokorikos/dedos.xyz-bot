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
  const argsArray =
    typeof builderArgs === "undefined"
      ? []
      : Array.isArray(builderArgs)
      ? builderArgs
      : [builderArgs];

  const { embed } = await builderFn(...argsArray);
  const gif = new AttachmentBuilder(GIF_PATH, { name: "dedosgift.gif" });

  const { method, files: extraFiles = [], ...restOptions } = sendOptions ?? {};

  const options = {
    ...restOptions,
    embeds: [embed],
    files: [...extraFiles, gif],
  };

  if (method) {
    if (typeof target[method] !== "function") {
      throw new Error(
        `sendEmbed: target does not support the requested method "${method}"`
      );
    }
    return target[method](options);
  }

  if (typeof target.send === "function") {
    return target.send(options);
  }

  if (typeof target.reply === "function") {
    return target.reply(options);
  }

  throw new Error("sendEmbed: target does not support sending messages");
}
