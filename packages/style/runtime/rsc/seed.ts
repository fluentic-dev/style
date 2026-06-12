import { RUNTIME_CONFIG } from '../../config';
import { createSheetLayerState, getLayerTextForNames, wrapRuleWithLayer } from '../../sheet/utils';
import type { DevCssRulePayload } from '../dev';
import { CSS_DEV_STYLE_SEED_GLOBAL } from './constants';

type RscDevSeed = {
  rules: DevCssRulePayload[];
  keys: Set<string>;
};

type RscDevGlobal = typeof globalThis & {
  [CSS_DEV_STYLE_SEED_GLOBAL]?: RscDevSeed;
};

export function collectRscDevSeedCss(rules: DevCssRulePayload[]): void {
  if (!RUNTIME_CONFIG.isDev || !RUNTIME_CONFIG.isRSC) return;
  if (typeof window !== 'undefined') return;

  const seed = getSeed();

  for (let i = 0, len = rules.length; i < len; i++) {
    const rule = rules[i];
    const [key, css] = rule;
    if (!key || !css || seed.keys.has(key)) continue;

    seed.keys.add(key);
    seed.rules.push(rule);
  }
}

export function getRscDevSeedCss(): string {
  if (!RUNTIME_CONFIG.isDev || !RUNTIME_CONFIG.isRSC) return '';
  if (typeof window !== 'undefined') return '';

  const seed = (globalThis as RscDevGlobal)[CSS_DEV_STYLE_SEED_GLOBAL];
  if (!seed?.rules.length) return '';

  const layerState = createSheetLayerState();
  const css = seed.rules.map(([, ruleCss, , priority]) => {
    return wrapRuleWithLayer(ruleCss, layerState.getName(priority));
  });
  const layerText = getLayerTextForNames(RUNTIME_CONFIG.layers, layerState.getNames());

  return (layerText ? layerText + '\n' : '') + css.join('\n') + '\n';
}

function getSeed(): RscDevSeed {
  return (globalThis as RscDevGlobal)[CSS_DEV_STYLE_SEED_GLOBAL] ??= {
    rules: [],
    keys: new Set(),
  };
}
