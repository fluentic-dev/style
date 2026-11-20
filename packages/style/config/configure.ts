import { BUILD_CONFIG } from './build';
import { setStyleCheckOptions, type StyleCheckOptions } from './config/check';
import { CSS_CONFIG, type CssConfig } from './config/css';
import { setDebugClassNameEnabled } from './config/debug';
import { RUNTIME_CONFIG } from './config/runtime';
import { setRuntimeDocument } from './document';
import { getCacheTTL } from './utils';

export type { CheckImportantOptions, StyleCheckLevel, StyleCheckOptions } from './config/check';

export type RuntimeCssOptions = Partial<CssConfig> & {
  debugClassName?: boolean;
};

export type ConfigureStyleRuntimeOptions = {
  /** false disables stylesheet injection; true uses the global document (default). */
  document?: boolean | Document;
  css?: RuntimeCssOptions;
  check?: StyleCheckOptions;
  cacheTTL?: boolean | number;
};

export function configureStyleRuntime(options: ConfigureStyleRuntimeOptions = {}) {
  if (options.document !== undefined) setRuntimeDocument(options.document);
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

  if (options.check) {
    checkBuildConfig('check');
    setStyleCheckOptions(options.check);
  }
}

function checkBuildConfig(field: string) {
  if (!BUILD_CONFIG.current) return;

  throw new Error(`Configure "${field}" via plugin options.`);
}
