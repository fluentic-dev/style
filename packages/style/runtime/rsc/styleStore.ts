import { getLayerBlockCss, getLayerOrderCss, joinLayerCss } from '../../atomic/layer';
import { RUNTIME_CONFIG } from '../../config';
import type { SheetRule } from '../../sheet';
import { createSheetLayerState, getSheetRulePriority } from '../../sheet/utils';
import { clearGlobalData, getGlobalData, globalData } from '../../utils/global';
import { IS_SERVER_RUNTIME } from '../env';

const GLOBAL_KEY = 'runtime.rsc.styleStore';

type RscStyleStore = {
  rules: SheetRule[];
  keys: Set<string>;
  //
  counter: number;
  lastCounter: number;
};

export function addRscStyleRules(rules: SheetRule[]): void {
  if (!RUNTIME_CONFIG.isRSC) return;
  if (!IS_SERVER_RUNTIME) return;

  const store = getRscStyleStore();

  for (let i = 0, len = rules.length; i < len; i++) {
    const rule = rules[i];
    if (!rule.key || !rule.css || store.keys.has(rule.key)) continue;

    store.keys.add(rule.key);
    store.rules.push(rule);
  }

  store.counter += 1;
}

export function getRscStyleCssIfChanged() {
  const store = getGlobalData<RscStyleStore>(GLOBAL_KEY);
  if (!store) return null;

  if (store.counter === store.lastCounter) return null;

  store.lastCounter = store.counter;

  return getRscStyleCss();
}

export function getRscStyleCss(): string {
  if (!RUNTIME_CONFIG.isRSC) return '';
  if (!IS_SERVER_RUNTIME) return '';

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
    counter: 0,
    lastCounter: 0,
    rules: [],
    keys: new Set(),
  }));
}

export function clearRscStyleStore(): void {
  clearGlobalData(GLOBAL_KEY);
}
