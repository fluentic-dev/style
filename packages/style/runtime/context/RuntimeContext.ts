import { RUNTIME_CONFIG } from '../../config';
import { createStyleSheet, type StyleSheet } from '../../sheet';
import { createCssInstancePool, type CssInstancePool } from '../instance';

export type CssRuntimeContext = {
  pool: CssInstancePool;
  sheet: StyleSheet;
};

let defaultContext: CssRuntimeContext | null = null;

export function useCssRuntimeContext() {
  return getDefaultContext();
}

function getDefaultContext(): CssRuntimeContext {
  if (!defaultContext) {
    defaultContext = {
      pool: createCssInstancePool(RUNTIME_CONFIG.cssCacheTTL),
      sheet: createStyleSheet(),
    };
  }

  return defaultContext;
}
