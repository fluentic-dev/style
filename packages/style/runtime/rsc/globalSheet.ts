import {
  cache,
  cloneElement,
  type ComponentType,
  createElement,
  Fragment,
  type ReactElement,
  type ReactNode,
} from 'react';
import { type DebugData, isDebugData } from '../../builder/data';
import { DEV_CONFIG } from '../../config/config/dev';
import { buildGlobalSheetRules, createGlobalSheet as createClientGlobalSheet } from '../../css/globalSheet';
import type { SheetRule } from '../../sheet';
import { globalData } from '../../utils/global';
import { hashString } from '../../utils/hash';
import { IS_SERVER_RUNTIME } from '../env';
import { GLOBAL_RULES_ATTR, GLOBAL_SEED_ATTR } from './constants';
import { getRscStyleRules, serializeRscRules } from './styleStore';

type GlobalDebug = DebugData & { globalModule?: string; };
export type GlobalRuleBatch = { owner: string; revision: string; rules: SheetRule[]; };
type Registry = Map<string, SheetRule[]>;
type SeedComponent = ComponentType<{ globalRules?: GlobalRuleBatch[]; seedOnly?: boolean; }>;
const seedComponent = globalData<{ current: SeedComponent | null; }>(
  'runtime.rsc.global.seedComponent',
  () => ({ current: null }),
);
/** Registered only by the Next loader, keeping the core RSC runtime framework-neutral. */
export function setGlobalSheetSeedComponent(component: SeedComponent) {
  seedComponent.current = component;
}

// Module definitions survive module caching; render-time values live only in React's request cache.
const modules = globalData<Registry>('runtime.rsc.global.modules', () => new Map());
const requestRegistry = globalData('runtime.rsc.global.request', () => cache(() => new Map<string, SheetRule[]>()));
const delivered = globalData('runtime.rsc.global.delivered', () => cache(() => new Map<string, string>()));

export function resetGlobalSheetModule(filePath: string) {
  if (!IS_SERVER_RUNTIME) return;
  if (modules.has(filePath)) modules.set(filePath, []);
}

export const createGlobalSheet: typeof createClientGlobalSheet = (
  ...args: Parameters<typeof buildGlobalSheetRules>
) => {
  if (!IS_SERVER_RUNTIME) {
    (createClientGlobalSheet as (...args: Parameters<typeof buildGlobalSheetRules>) => void)(...args);
    return;
  }
  const debug = (isDebugData(args[1]) ? args[1] : args[2]) as GlobalDebug | undefined;
  const rules = buildGlobalSheetRules(...args);
  if (debug?.globalModule) {
    const existing = modules.get(debug.globalModule) ?? [];
    modules.set(debug.globalModule, [...existing, ...rules]);
  } else {
    const owner = 'request:' + (debug ? debug.sourceUrl + ':' + debug.loc.join(':') : rules[0]?.key ?? 'empty');
    requestRegistry().set(owner, rules);
  }
};

export function getGlobalRuleBatches(): GlobalRuleBatch[] {
  return [...modules, ...requestRegistry()].map(([owner, rules]) => ({
    owner,
    revision: hashString(JSON.stringify(rules)),
    rules,
  }));
}

export function serializeGlobalRuleBatches(batches: GlobalRuleBatch[]) {
  return JSON.stringify(batches).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

// This server component travels in Flight as well as initial HTML. Its cursor is request-local.
export function GlobalSheetPayload() {
  const cursor = delivered();
  return renderGlobalRuleBatches(
    getGlobalRuleBatches().filter((batch) => {
      if (cursor.get(batch.owner) === batch.revision) return false;
      cursor.set(batch.owner, batch.revision);
      return true;
    }),
  );
}

export function renderGlobalRuleBatches(batches: GlobalRuleBatch[]) {
  if (!batches.length) return null;
  const payload = serializeGlobalRuleBatches(batches);
  const current = new Map(getGlobalRuleBatches().map((batch) => [batch.owner, batch]));
  for (const batch of batches) current.set(batch.owner, batch);
  const allBatches = [...current.values()];
  const css = serializeRscRules([...getRscStyleRules(), ...allBatches.flatMap((batch) => batch.rules)]);
  const id = hashString(payload + css);
  return createElement(
    Fragment,
    null,
    seedComponent.current ? createElement(seedComponent.current, { globalRules: allBatches, seedOnly: true }) : null,
    createElement('style', {
      [GLOBAL_SEED_ATTR]: id,
      href: 'fluentic-global-' + id,
      precedence: 'default',
      dangerouslySetInnerHTML: { __html: css.replace(/<\/style/gi, '<\\/style') },
      suppressHydrationWarning: true,
    }),
    createElement('script', {
      type: 'application/json',
      async: true,
      [GLOBAL_RULES_ATTR]: id,
      dangerouslySetInnerHTML: { __html: payload },
      suppressHydrationWarning: true,
    }),
  );
}

export function withGlobalSheetPayload(element: ReactElement, type: unknown): ReactElement {
  if (
    !IS_SERVER_RUNTIME || !DEV_CONFIG.isDev ||
    (typeof type === 'string' && ['html', 'head', 'style', 'script', 'meta', 'link', 'title'].includes(type))
  ) return element;
  if (typeof type === 'string' && !modules.size && !requestRegistry().size) return element;
  if (type === 'body') {
    const props = element.props as { children?: ReactNode; };
    return cloneElement(element, {}, createElement(GlobalSheetPayload), props.children);
  }
  return createElement(
    Fragment,
    element.key == null ? null : { key: element.key },
    typeof type === 'string' ? createElement(GlobalSheetPayload) : element,
    typeof type === 'string' ? element : createElement(GlobalSheetPayload),
  );
}
