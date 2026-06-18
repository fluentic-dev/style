import { globalData } from '../../utils/global';
import { getCacheTTL } from '../utils';

export type RuntimeConfig = {
  changes: number;

  isPlugin: boolean;
  isHoist: boolean;
  isExtracted: boolean;
  isRSC: boolean;

  runtimeCacheTTL: number;
};

export const RUNTIME_CONFIG_DEFAULT: RuntimeConfig = {
  changes: 0,

  isPlugin: false,
  isHoist: false,
  isExtracted: false,
  isRSC: false,

  runtimeCacheTTL: getCacheTTL(true),
};

export const RUNTIME_CONFIG = globalData<RuntimeConfig>(
  'config.runtime',
  () => ({ ...RUNTIME_CONFIG_DEFAULT }),
);
