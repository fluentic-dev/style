import { ensureLayerPlaceholder } from '../atomic/layer';
import { globalData } from '../utils/global';
import { DEFAULT_RUNTIME_CONFIG } from './default';
import type { BuildMeta, PriorityMode, RuntimeConfig, RuntimeOptions } from './types';

export const RUNTIME_CONFIG = globalData<RuntimeConfig>(
  'runtime.config',
  () => ({ ...DEFAULT_RUNTIME_CONFIG }),
);

let configVersion = 0;
let runtimeOptions: RuntimeOptions | null = null;
let buildMeta: BuildMeta | null = null;

export function configureRuntime(options: RuntimeOptions) {
  runtimeOptions = options;
  applyRuntimeConfig();
}

export function setBuildMeta(meta: BuildMeta | null) {
  buildMeta = meta;
  applyRuntimeConfig();
}

export function setSourcemapTraceMode(mode: RuntimeOptions['sourcemapTrace']) {
  runtimeOptions = {
    ...runtimeOptions,
    sourcemapTrace: mode,
  };
  applyRuntimeConfig();
}

export function setPriorityMode(mode: PriorityMode) {
  runtimeOptions = {
    ...runtimeOptions,
    priorityMode: mode,
  };
  applyRuntimeConfig();
}

function applyRuntimeConfig() {
  const config = RUNTIME_CONFIG;

  const options = Object.assign({}, runtimeOptions, buildMeta?.css);

  const dev = buildMeta
    ? buildMeta.dev
    : (options.dev ?? false);

  const layer = runtimeOptions?.layer ??
    buildMeta?.layer ??
    DEFAULT_RUNTIME_CONFIG.layer;

  const priorityMode = runtimeOptions?.priorityMode ??
    buildMeta?.priorityMode ??
    (layer === false ? 'sort' : DEFAULT_RUNTIME_CONFIG.priorityMode);

  const sourcemapTrace = options.sourcemapTrace ??
    buildMeta?.sourcemapTrace ??
    config.sourcemapTrace;

  Object.assign(config, DEFAULT_RUNTIME_CONFIG);

  config.configVersion = ++configVersion;

  config.buildMeta = buildMeta;
  config.layer = layer;
  config.priorityMode = priorityMode;
  config.sourcemapTrace = sourcemapTrace;

  config.isDev = dev;
  config.isRSC = buildMeta?.rsc || false;
  config.isCssExtracted = buildMeta?.extract || false;
  config.isHoistEnabled = buildMeta?.hoist || false;

  config.isTraceEnabled = options.trace ?? dev;
  config.isCheckSelectorEnabled = options.checkSelector ?? dev;
  config.isSourcemapEnabled = options.sourcemap ?? dev;

  config.devUtils = options.devUtils ?? config.devUtils;

  config.runtimeCacheTTL = getCacheTTL(options.cache ?? config.runtimeCacheTTL);

  config.layerNamespace = options.layerNamespace ?? config.layerNamespace;
  config.layers = ensureLayerPlaceholder(options.layers ?? config.layers);

  config.classNamePrefix = options.classNamePrefix ?? config.classNamePrefix;

  // scopeTargetPrefix is always required
  config.scopeTargetPrefix = options.scopeTargetPrefix || config.scopeTargetPrefix;

  config.themeNamePrefix = options.themeNamePrefix || config.themeNamePrefix;

  config.tokenVarPrefix = options.tokenVarPrefix ?? config.tokenVarPrefix;

  config.sheetMaxRules = options.sheetMaxRules ?? config.sheetMaxRules;
  config.sheetStyleTagNonce = options.sheetStyleTagNonce ?? config.sheetStyleTagNonce;

  config.localClassName = options.localClassName ?? dev;
  config.debugClassName = options.debugClassName ?? dev;

  config.debugPropertyLength = options.debugPropertyLength ??
    config.debugPropertyLength;

  config.debugValueLength = options.debugValueLength ??
    config.debugValueLength;

  config.debugSelectorLength = options.debugSelectorLength ??
    config.debugSelectorLength;

  config.debugParentSelectorLength = options.debugParentSelectorLength ??
    config.debugParentSelectorLength;

  config.debugAtRuleLength = options.debugAtRuleLength ??
    config.debugAtRuleLength;
}

function getCacheTTL(cache: boolean | number) {
  return cache === true ? 300_000 : cache === false ? 0 : Math.max(cache, 0);
}
