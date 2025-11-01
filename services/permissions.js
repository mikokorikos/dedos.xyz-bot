// services/permissions.js
// Checar permisos del que usa comandos/botones
import { config } from "../constants/config.js";

export function isOwner(userId) {
  return userId === config.OWNER_ID;
}

export function isStaff(member) {
  if (!member) return false;
  if (!config.TICKET_STAFF_ROLE_IDS) return false;
  const staffRoles = config.TICKET_STAFF_ROLE_IDS.split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  return staffRoles.some((roleId) => member.roles.cache.has(roleId));
}
