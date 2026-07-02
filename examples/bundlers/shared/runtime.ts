import { configureStyleRuntime } from '@fluentic/style/config';
import { enableStyleDevUtils } from '@fluentic/style/dev';

export function configureBundlerRuntime(dev = isBundlerDev()) {
  enableBundlerDevUtils(dev);

  configureStyleRuntime();
}

export function enableBundlerDevUtils(dev = isBundlerDev()) {
  if (dev) enableStyleDevUtils();
}

function isBundlerDev() {
  const env = (import.meta as ImportMeta & {
    env?: {
      DEV?: boolean;
      MODE?: string;
    };
  }).env;

  if (typeof env?.DEV === 'boolean') return env.DEV;
  if (env?.MODE) return env.MODE !== 'production';

  const process = (globalThis as {
    process?: {
      env?: {
        NODE_ENV?: string;
      };
    };
  }).process;

  return process?.env?.NODE_ENV !== 'production';
}
