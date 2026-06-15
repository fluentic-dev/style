/* runtime config */

export type CssConfig = {
  layers: string[];
  layerNamespace: string;
  classNamePrefix: string;
  scopeTargetPrefix: string;
  themeNamePrefix: string;
  tokenVarPrefix: string;
  localClassName: boolean;
  debugClassName: boolean;
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
  sourcemapTrace: SourcemapTrace;

  isDev: boolean;
  isRSC: boolean;
  isCssExtracted: boolean;
  isHoistEnabled: boolean;

  isTraceEnabled: boolean;
  isCheckSelectorEnabled: boolean;
  isSourcemapEnabled: boolean;

  devUtils: string;

  runtimeCacheTTL: number;
};

export type RuntimeOptions = Partial<RuntimeSharedConfig> & {
  dev?: boolean;
  devUtils?: string;
  trace?: boolean;
  cache?: boolean | number;
  checkSelector?: boolean;
  sourcemap?: boolean;
  sourcemapTrace?: SourcemapTrace;
  layer?: boolean;
  priorityMode?: PriorityMode;
  localClassName?: boolean;
};

/* build meta */

export type BuildCssConfig = Partial<CssConfig>;

export type SourcemapTrace = 'style' | 'value';
export type PriorityMode = 'layer' | 'sort';

export type BuildMeta = {
  dev: boolean;
  extract: boolean;
  hoist: boolean;
  rsc: boolean;
  layer?: boolean;
  priorityMode?: PriorityMode;
  sourcemapTrace?: SourcemapTrace;
  css: BuildCssConfig | null;
};
