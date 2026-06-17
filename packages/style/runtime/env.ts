import { RUNTIME_CONFIG } from '../config';

export const IS_SERVER_RUNTIME = typeof window === 'undefined';

export function isServerRSC() {
  return RUNTIME_CONFIG.isRSC && IS_SERVER_RUNTIME;
}
