import type { LayerPriority } from '../atomic/layer';
import type { DebugData } from '../builder/data/debug';
import type { NamedSheetLayer } from '../config/config/css';
import type { TraceCallsite } from '../utils/trace';

export type SheetCallsite = Pick<TraceCallsite, 'filePath' | 'sourceUrl' | 'sourceContent' | 'line' | 'column'>;

export type SheetRule = {
  css: string;
  key?: string | null;
  priority?: LayerPriority | null;
  important?: boolean;
  importantNative?: boolean;
  sheet?: boolean;
  globalSheet?: { id: string; order: number; };
  layer?: 'style' | 'sheet' | false | NamedSheetLayer;
  callsite?: SheetCallsite | null;
  debug?: DebugData | null;
  debugField?: string | null;
};

export type SheetOptions = {
  document?: Document | null;
  dev?: boolean;
  maxRules?: number;
  nonce?: string | null;
  sourcemap?: boolean;
  tagName?: string;
  top?: boolean;
};

export type StyleSheet = {
  updateLayers(layers: readonly string[]): void;
  insert(rule: SheetRule | string): void;
  flush(): void;
  replaceRules?(owner: string, rules: SheetRule[]): void;
  destroy?(): void;
};
