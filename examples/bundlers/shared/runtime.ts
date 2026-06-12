import { configureRuntime } from '@fluentic/style/config';
import { enableDevUtils } from '@fluentic/style/dev';

export function configureBundlerRuntime(dev: boolean) {
  if (dev) enableDevUtils();

  configureRuntime({ dev });
}
