import { configureStyleRuntime } from '@fluentic/style/config';
import { enableStyleDevUtils } from '@fluentic/style/dev';

export function configureBundlerRuntime(dev: boolean) {
  if (dev) enableStyleDevUtils();

  configureStyleRuntime();
}
