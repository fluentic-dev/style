import { globalData } from '../../utils/global';
import { unsetAll } from '../../utils/object';
import type { BuildDevConfig } from '../build';
import type { SourcemapLocationMode, StylePriorityMode } from '../types';
import { RUNTIME_CONFIG } from './runtime';

export type DevConfig = {
  isDev: boolean;

  isCheckSelectorEnabled: boolean;
  isSourcemapEnabled: boolean;
  isLocalClassNameEnabled: boolean;

  sheetMaxRules: number;
  sheetStyleTagNonce: string | null;

  stylePriorityMode: StylePriorityMode;
  sourcemapLocationMode: SourcemapLocationMode;

  isElementClassNameEnabled: boolean;
};

export const DEV_CONFIG_DEFAULT: DevConfig = {
  isDev: false,

  isCheckSelectorEnabled: true,
  isSourcemapEnabled: true,
  isLocalClassNameEnabled: true,

  sheetMaxRules: 1000,
  sheetStyleTagNonce: null,

  stylePriorityMode: 'layer',
  sourcemapLocationMode: 'style',

  isElementClassNameEnabled: true,
};

type PartialDevConfig = {
  config: Partial<DevConfig> | null;
};

export const DEV_CONFIG = globalData<DevConfig>(
  'config.dev',
  () => ({ ...DEV_CONFIG_DEFAULT }),
);

const configBase = globalData<PartialDevConfig>(
  'config.dev.base',
  () => ({ config: null }),
);

const configUtils = globalData<PartialDevConfig>(
  'config.dev.utils',
  () => ({ config: null }),
);

export type DevRuntimeOptions = {
  priorityMode?: StylePriorityMode | null;
  sourcemapMode?: SourcemapLocationMode | null;
  elementClassName?: boolean | null;
  checkSelector?: boolean | null;
};

export function setBuildDevConfig(config: BuildDevConfig) {
  const checkSelector = config.checkSelector === 'force' ? false : config.checkSelector;

  setDevRuntimeOptions({ ...config, checkSelector });
}

export function setDevUtilsRuntimeOptions(options: DevRuntimeOptions | null) {
  setOptions(configBase, options);
  rebuildDevConfig();
}

export function setDevRuntimeOptions(options: DevRuntimeOptions | null) {
  setOptions(configBase, options);
  rebuildDevConfig();
}

function rebuildDevConfig() {
  unsetAll(DEV_CONFIG);

  Object.assign(
    DEV_CONFIG,
    DEV_CONFIG_DEFAULT,
    configBase.config,
    configUtils.config,
  );

  RUNTIME_CONFIG.changes += 1;
}

function setOptions(
  partialConfig: PartialDevConfig,
  options: DevRuntimeOptions | null,
) {
  if (!options) {
    partialConfig.config = null;
    return;
  }

  if (!partialConfig.config) {
    partialConfig.config = {};
  }

  const config = partialConfig.config;

  if (options.priorityMode) {
    config.stylePriorityMode = options.priorityMode;
  }

  if (options.sourcemapMode) {
    config.sourcemapLocationMode = options.sourcemapMode;
  }

  if (typeof options.elementClassName === 'boolean') {
    config.isElementClassNameEnabled = options.elementClassName;
  }

  if (typeof options.checkSelector === 'boolean') {
    config.isCheckSelectorEnabled = options.checkSelector;
  }
}
