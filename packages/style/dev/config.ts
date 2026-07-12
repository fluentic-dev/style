import { type DevRuntimeOptions, setDevRuntimeOptions, setStyleDevMode } from '../config/config/dev';
import { enableStyleDevUtils, type StyleDevUtilsOptions } from './utils';

export type ConfigureStyleDevOptions = DevRuntimeOptions & {
  utils?: StyleDevUtilsOptions;
};

export function configureStyleDev(options: ConfigureStyleDevOptions = {}) {
  const { utils, ...devOptions } = options;

  setStyleDevMode(true);
  setDevRuntimeOptions(devOptions);

  if (utils) enableStyleDevUtils(utils);
}
