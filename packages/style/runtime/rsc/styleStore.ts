import { getLayerBlockCss, getLayerOrderCss, joinLayerCss } from '../../atomic/layer';
import { RUNTIME_CONFIG } from '../../config';
import type { SheetRule } from '../../sheet';
import { createSheetLayerState, getSheetRulePriority } from '../../sheet/utils';
import { clearGlobalData, getGlobalData, globalData } from '../../utils/global';

const GLOBAL_KEY = 'runtime.rsc.styleStore';

type RscStyleStore = {
  rules: SheetRule[];
  keys: Set<string>;
};

export function addRscStyleRules(rules: SheetRule[]): void {
  if (!RUNTIME_CONFIG.isRSC) return;
  if (typeof window !== 'undefined') return;

  const store = getRscStyleStore();

  for (let i = 0, len = rules.length; i < len; i++) {
    const rule = rules[i];
    if (!rule.key || !rule.css || store.keys.has(rule.key)) continue;

    store.keys.add(rule.key);
    store.rules.push(rule);
  }
}

export function getRscStyleCss(): string {
  if (!RUNTIME_CONFIG.isRSC) return '';
  if (typeof window !== 'undefined') return '';

  const store = getGlobalData<RscStyleStore>(GLOBAL_KEY);
  if (!store?.rules.length) return '';

  const layerState = createSheetLayerState();

  const cssItems = store.rules.map((rule) => {
    return getLayerBlockCss(
      layerState.getName(getSheetRulePriority(rule.priority)),
      rule.css,
    );
  });

  const layerOrderCss = getLayerOrderCss(
    RUNTIME_CONFIG.layers,
    layerState.getNames(),
  );

  return joinLayerCss(layerOrderCss, cssItems);
}

function getRscStyleStore(): RscStyleStore {
  return globalData(GLOBAL_KEY, () => ({
    rules: [],
    keys: new Set(),
  }));
}

export function clearRscStyleStore(): void {
  clearGlobalData(GLOBAL_KEY);
}
