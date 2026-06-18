import { DEV_CONFIG } from '../config/config/dev';
import { createDevSheet } from './dev';
import { createProdSheet } from './prod';
import type { SheetOptions } from './types';

export function createStyleSheet(options: SheetOptions = {}) {
  const dev = options.dev ?? DEV_CONFIG.isDev;

  return dev ? createDevSheet(options) : createProdSheet(options);
}
