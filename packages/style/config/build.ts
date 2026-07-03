import { globalData } from '../utils/global';
import type { ReplaceProps } from '../utils/type';
import { CSS_CONFIG, type CssConfig } from './config/css';
import type { DevRuntimeOptions } from './config/dev';
import { RUNTIME_CONFIG } from './config/runtime';
import type { CheckSelectorMode } from './types';

export type BuildCssConfig = Partial<CssConfig>;

export type BuildDevConfig = ReplaceProps<DevRuntimeOptions, {
  checkSelector?: CheckSelectorMode;
}>;

export type BuildConfig = {
  hoist: boolean;
  css: BuildCssConfig;
};

export const BUILD_CONFIG = globalData(
  'config.build',
  () => ({ current: null as BuildConfig | null }),
);

export function setBuildConfig(config: BuildConfig) {
  BUILD_CONFIG.current = config;

  RUNTIME_CONFIG.isHoist = config.hoist;

  if (config.css) {
    Object.assign(CSS_CONFIG, config.css);
  }
}
