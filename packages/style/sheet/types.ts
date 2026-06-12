import type { DebugData } from '../builder/data/debug';
import type { LayerPriority } from '../atomic/layer';
import type { TraceCallsite } from '../utils/trace';

export type SheetCallsite = Pick<TraceCallsite, 'filePath' | 'sourceUrl' | 'sourceContent' | 'line' | 'column'>;

export type SheetRule = {
  css: string;
  key?: string | null;
  priority?: LayerPriority | null;
  callsite?: SheetCallsite | null;
  debug?: DebugData | null;
};

export type SheetOptions = {
  document?: Document | null;
  dev?: boolean;
  maxRules?: number;
  nonce?: string | null;
  sourcemap?: boolean;
};

export type StyleSheet = {
  updateLayers(layers: readonly string[]): void;
  insert(rule: SheetRule | string): void;
  flush(): void;
};
