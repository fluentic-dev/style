/* runtime config */

import type { OmitProps } from '../utils/type';

export type CssConfig = {
  layers: string[];
  layerNamespace: string;
  classNamePrefix: string;
  scopeTargetPrefix: string;
  themeNamePrefix: string;
  tokenVarPrefix: string;
  localClassName: boolean;
  debugClassName: boolean;
  debugElementClassName: boolean;
  debugElementClassNamePrefix: string;
  debugPropertyLength: number;
  debugValueLength: number;
  debugSelectorLength: number;
  debugParentSelectorLength: number;
  debugAtRuleLength: number;
};

export type RuntimeSharedConfig = CssConfig & {
  sheetMaxRules: number;
  sheetStyleTagNonce: string | null;
};

export type RuntimeConfig = RuntimeSharedConfig & {
  configVersion: number;
  buildMeta: BuildMeta | null;
  layer: boolean;
  priorityMode: PriorityMode;
  sourcemapTrace: SourcemapTraceMode;

  isDev: boolean;
  isRSC: boolean;
  isCssExtracted: boolean;
  isHoistEnabled: boolean;

  isTraceEnabled: boolean;
  isCheckSelectorEnabled: boolean;
  isSourcemapEnabled: boolean;

  runtimeCacheTTL: number;
};

export type RuntimeOptions =
  & Partial<OmitProps<RuntimeSharedConfig, 'debugElementClassName' | 'debugElementClassNamePrefix'>>
  & {
    dev?: boolean;
    cache?: boolean | number;
    sourcemap?: boolean;
    sourcemapTrace?: SourcemapTraceMode;
    layer?: boolean;
    priorityMode?: PriorityMode;
    localClassName?: boolean;
  };

export type DevRuntimeOptions = {
  priorityMode?: PriorityMode;
  sourcemapTrace?: SourcemapTraceMode;
  debugElementClassName?: boolean;
};

/* build meta */

export type BuildCssConfig = Partial<CssConfig>;

export type SourcemapTraceMode = 'style' | 'value';
export type PriorityMode = 'layer' | 'sort';
export type CheckSelectorMode = boolean | 'force';

export type BuildMeta = {
  dev: boolean;
  extract: boolean;
  hoist: boolean;
  rsc: boolean;
  layer?: boolean;
  priorityMode?: PriorityMode;
  sourcemapTrace?: SourcemapTraceMode;
  checkSelector?: CheckSelectorMode;
  css: BuildCssConfig | null;
};
