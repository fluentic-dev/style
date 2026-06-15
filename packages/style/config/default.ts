import { LayerDefaultNamespace, LayerPlaceholder } from '../atomic/layer';
import type { RuntimeConfig } from './types';

export const DEFAULT_RUNTIME_CONFIG: RuntimeConfig = {
  buildMeta: null,
  configVersion: 0,
  layer: true,
  priorityMode: 'layer',
  sourcemapTrace: 'style',

  isDev: false,
  isRSC: false,
  isCssExtracted: false,
  isHoistEnabled: false,

  isTraceEnabled: false,
  isCheckSelectorEnabled: false,
  isSourcemapEnabled: false,

  devUtils: 'StyleDevUtils',

  runtimeCacheTTL: getCacheTTL(true),

  layers: [LayerPlaceholder],
  layerNamespace: LayerDefaultNamespace,
  classNamePrefix: '',
  scopeTargetPrefix: '-',
  themeNamePrefix: 'theme-',
  tokenVarPrefix: 'token-',
  sheetMaxRules: 1000,
  sheetStyleTagNonce: null,
  localClassName: false,
  debugClassName: false,
  debugPropertyLength: 24,
  debugValueLength: 8,
  debugSelectorLength: 8,
  debugParentSelectorLength: 8,
  debugAtRuleLength: 10,
};

function getCacheTTL(cache: boolean | number) {
  return cache === true ? 300_000 : cache === false ? 0 : Math.max(cache, 0);
}
