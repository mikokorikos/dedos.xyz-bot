import { COMMAND_PREFIX } from '../../config/constants.js';
import { guard } from '../../utils/guard.js';
import { handleHelpCommand } from './logic.js';

export const helpFeature = {
  commands: [
    { type: 'slash', name: 'help', execute: guard(handleHelpCommand, { hasPermission: () => true }) },
    { type: 'prefix', name: `${COMMAND_PREFIX}help`, execute: guard(handleHelpCommand, { hasPermission: () => true }) },
  ],
};
