import { CSS_CONFIG } from '../../config/config/css';
import { DEV_CONFIG } from '../../config/config/dev';
import { RUNTIME_CONFIG } from '../../config/config/runtime';
import type { SheetRule } from '../../sheet';
import { serializeOrderedRules } from '../../sheet/ordering';
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

  return serializeRscRules(getRscStyleRules());
}

export function getRscStyleRules(): readonly SheetRule[] {
  return getGlobalData<RscStyleStore>(GLOBAL_KEY)?.rules ?? [];
}

export function serializeRscRules(rules: readonly SheetRule[]): string {
  return serializeOrderedRules(rules, CSS_CONFIG, DEV_CONFIG.stylePriorityMode);
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
