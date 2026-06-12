import { RUNTIME_CONFIG } from '../config';
import { createDevSheet } from './dev';
import { createProdSheet } from './prod';
import type { SheetOptions } from './types';

export function createStyleSheet(options: SheetOptions = {}) {
  const dev = options.dev ?? RUNTIME_CONFIG.isDev;

  return dev ? createDevSheet(options) : createProdSheet(options);
}
