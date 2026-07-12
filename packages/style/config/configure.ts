import { BUILD_CONFIG } from './build';
import { CSS_CONFIG, type CssConfig } from './config/css';
import { setDebugClassNameEnabled } from './config/debug';
import { RUNTIME_CONFIG } from './config/runtime';
import { getCacheTTL } from './utils';

export type RuntimeCssOptions = Partial<CssConfig> & {
  debugClassName?: boolean;
};

export type ConfigureStyleRuntimeOptions = {
  css?: RuntimeCssOptions;
  cacheTTL?: boolean | number;
};

export function configureStyleRuntime(options: ConfigureStyleRuntimeOptions = {}) {
  if (options.css) {
    checkBuildConfig('css');
    const { debugClassName, ...css } = options.css;
    Object.assign(CSS_CONFIG, css);

    if (typeof debugClassName === 'boolean') {
      setDebugClassNameEnabled(debugClassName);
    }
  }

  if (options.cacheTTL !== undefined) {
    RUNTIME_CONFIG.runtimeCacheTTL = getCacheTTL(options.cacheTTL);
  }
}

function checkBuildConfig(field: string) {
  if (!BUILD_CONFIG.current) return;

  throw new Error(`Configure "${field}" via plugin options.`);
}
