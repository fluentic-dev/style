import { PLUGIN_NAME } from './constants';

export function formatError(msg: string) {
  return `[${PLUGIN_NAME}] ${msg}`;
}
