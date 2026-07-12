import { globalData } from '../../utils/global';
import { normalizeHashLength } from '../../utils/hash';
import { unsetAll } from '../../utils/object';
import type { BuildDevConfig } from '../build';
import type { SourcemapLocationMode, StylePriorityMode } from '../types';
import { setDebugClassNameDefault } from './debug';
import { RUNTIME_CONFIG } from './runtime';

export type DevConfig = {
  isDev: boolean;

  isCheckSelectorEnabled: boolean;
  isSourcemapEnabled: boolean;
  isLocalClassNameEnabled: boolean;

  sheetMaxRules: number;
  sheetStyleTagNonce: string | null;
  hashLength: number | null;

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
  hashLength: null,

  stylePriorityMode: 'sort',
  sourcemapLocationMode: 'style',

  isElementClassNameEnabled: true,
};

type PartialDevConfig = {
  config: Partial<DevConfig> | null;
};

export const IS_DEV = globalData<{ isDev: boolean; }>(
  'config.dev.isDev',
  () => ({ isDev: false }),
);

export const DEV_CONFIG = globalData<DevConfig>(
  'config.dev',
  () => ({ ...DEV_CONFIG_DEFAULT }),
);

export const configPlugin = globalData<PartialDevConfig>(
  'config.dev.plugin',
  () => ({ config: null }),
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
  hashLength?: number | null;
};

export function getBuildDevConfig() {
  return configPlugin.config;
}

export function setBuildDevConfig(config: BuildDevConfig) {
  const checkSelector = config.checkSelector === 'force' ? false : config.checkSelector;

  IS_DEV.isDev = true;

  setOptions(configPlugin, { ...config, checkSelector }, null);
  rebuildDevConfig();
}

export function setStyleDevMode(isDev: boolean) {
  IS_DEV.isDev = isDev;
  rebuildDevConfig();
}

export function setDevUtilsRuntimeOptions(options: DevRuntimeOptions | null) {
  setOptions(configUtils, options, null);
  rebuildDevConfig();
}

export function setDevRuntimeOptions(options: DevRuntimeOptions | null) {
  setOptions(configBase, options, { ...DEV_CONFIG_DEFAULT });
  rebuildDevConfig();
}

function rebuildDevConfig() {
  unsetAll(DEV_CONFIG);

  Object.assign(
    DEV_CONFIG,
    DEV_CONFIG_DEFAULT,
    configBase.config,
    configPlugin.config,
    configUtils.config,
  );

  DEV_CONFIG.isDev = IS_DEV.isDev;
  DEV_CONFIG.isLocalClassNameEnabled = DEV_CONFIG.isDev;
  setDebugClassNameDefault(DEV_CONFIG.isDev);

  RUNTIME_CONFIG.changes += 1;
}

function setOptions(
  partialConfig: PartialDevConfig,
  options: DevRuntimeOptions | null,
  defaultConfig: DevConfig | null,
) {
  if (!options) {
    partialConfig.config = defaultConfig;
    return;
  }

  if (!partialConfig.config) {
    partialConfig.config = defaultConfig || {};
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

  if (typeof options.hashLength === 'number') {
    config.hashLength = normalizeHashLength(options.hashLength);
  }
}
