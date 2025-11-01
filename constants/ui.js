// constants/ui.js
// Branding visual centralizado
import { EmbedBuilder } from "discord.js";

export const COLOR = 7602431;
export const BRAND_ICON =
  "https://cdn.discordapp.com/attachments/1430968221539766356/1431466022279319683/dedosxyz.png";
export const GIF_PATH = "./assets/dedosgift.gif";
export const ROBLOX_GROUP_URL = "https://dedos.xyz/roblox";

export function baseAuthor() {
  return {
    name: "dedos.xyz",
    iconURL: BRAND_ICON,
    url: "https://dedos.xyz",
  };
}

export function baseFooter() {
  return {
    text: "dedos.xyz",
    iconURL: BRAND_ICON,
  };
}
