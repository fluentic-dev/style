import { getScopeParentClassName } from '../../atomic/scope';
import {
  BUILDER_STATE,
  BUILDER_TYPE_SCOPE,
  BUILDER_TYPE_SLOT,
  getScopeTargetScope,
  getScopeTargetSlotId,
  getSlotId,
  isSlotData,
  isStyleData,
  type ScopeTargetData,
  type SlotData,
  type StyleData,
  type ThemeData,
} from '../../builder/data';
import type { StateItem } from '../../builder/data/state';
import { symbol } from '../../utils/const';

const TYPE: unique symbol = symbol('css.type') as typeof TYPE;
const STYLES: unique symbol = symbol('css.styles') as typeof STYLES;
const SCOPES: unique symbol = symbol('css.scopes') as typeof SCOPES;
const TOKENS: unique symbol = symbol('css.tokens') as typeof TOKENS;

const TYPE_ITEM = 0;
const TYPE_INSTANCE = 1;
const TYPE_THEME = 2;

export type CssResolvedItem<Data = unknown> = {
  [TYPE]: typeof TYPE_ITEM;
  data: Data;
  items: StateItem[];
  [TOKENS]?: CssTokenData | null;
};

export type CssResolvedTheme = {
  [TYPE]: typeof TYPE_THEME;
  data: ThemeData;
  className: string;
};

export type CssInstance<Styles = unknown> = InferData<Styles> & {
  [TYPE]: typeof TYPE_INSTANCE;
  [STYLES]: Styles;
  [SCOPES]: readonly ScopeTargetData[];
  [TOKENS]?: CssTokenData | null;
};

export type CssTokenData = {
  ids: readonly string[];
  values: readonly unknown[];
  lookup: Record<string, unknown>;
};

type InstanceData = {
  [TYPE]: typeof TYPE_INSTANCE;
  [STYLES]: unknown;
  [SCOPES]: readonly ScopeTargetData[];
  [TOKENS]: CssTokenData | null;
  cache: Record<string | symbol, CssInstance | CssResolvedItem | CssResolvedTheme>;
};

export function isCssItem<T>(value: unknown): value is CssResolvedItem<T> {
  return !!value && (value as CssResolvedItem)[TYPE] === TYPE_ITEM;
}

export function isCssInstance<T>(value: unknown): value is CssInstance<T> {
  return !!value && (value as CssInstance)[TYPE] === TYPE_INSTANCE;
}

export function isCssTheme(value: unknown): value is CssResolvedTheme {
  return !!value && (value as CssResolvedTheme)[TYPE] === TYPE_THEME;
}

export function createCssTheme(theme: ThemeData): CssResolvedTheme {
  return {
    [TYPE]: TYPE_THEME,
    data: theme,
    className: theme.className,
  };
}

export function createCssResolvedItem<Data extends StyleData | SlotData>(
  data: Data,
  scopes: readonly ScopeTargetData[],
): CssResolvedItem<Data> {
  return {
    [TYPE]: TYPE_ITEM,
    data,
    items: resolveItems(data, scopes),
  };
}

export function getCssInstanceStyles<T>(instance: CssInstance<T>) {
  return instance[STYLES];
}

export function getCssInstanceScopes(instance: CssInstance) {
  return instance[SCOPES];
}

export function getCssTokenData(value: CssInstance | CssResolvedItem) {
  return value[TOKENS] ?? null;
}

export function createCssInstance<T extends object>(
  styles: T,
  scopes: readonly ScopeTargetData[],
): CssInstance<T> {
  return createProxy(styles, scopes);
}

export function createCssInstanceTokenWrapper<T>(
  instance: CssInstance<T>,
  tokens: CssTokenData,
): CssInstance<T> {
  return createProxy(
    getCssInstanceStyles(instance),
    getCssInstanceScopes(instance),
    tokens,
    instance,
  );
}

function createProxy<T>(
  styles: T,
  scopes: readonly ScopeTargetData[],
  tokens: CssTokenData | null = null,
  base: CssInstance<T> | null = null,
) {
  const data: InstanceData = {
    [TYPE]: TYPE_INSTANCE,
    [STYLES]: styles,
    [SCOPES]: scopes,
    [TOKENS]: tokens,
    cache: {},
  };

  const proxy = new Proxy(data, base ? createTokenHandlers(base) : handlers);

  return proxy as unknown as CssInstance<T>;
}

const handlers: ProxyHandler<InstanceData> = {
  get(target, prop) {
    if (prop === TYPE) return target[TYPE];
    if (prop === STYLES) return target[STYLES];
    if (prop === SCOPES) return target[SCOPES];
    if (prop === TOKENS) return target[TOKENS];

    const { cache, [STYLES]: styles, [SCOPES]: scopes } = target;

    if (cache[prop]) return cache[prop];

    const value = (styles as any)?.[prop] ?? null;

    if (isStyleData(value) || isSlotData(value)) {
      return (cache[prop] = createCssResolvedItem(value, scopes));
    }

    if (value && typeof value === 'object') {
      return (cache[prop] = createProxy(value, scopes));
    }

    return value;
  },
};

function createTokenHandlers(base: CssInstance): ProxyHandler<InstanceData> {
  return {
    get(target, prop) {
      if (prop === TYPE) return target[TYPE];
      if (prop === STYLES) return target[STYLES];
      if (prop === SCOPES) return target[SCOPES];
      if (prop === TOKENS) return target[TOKENS];

      const { cache, [TOKENS]: tokens } = target;

      if (cache[prop]) return cache[prop];

      const value = (base as any)?.[prop] ?? null;

      if (isCssItem(value)) {
        const item: CssResolvedItem<unknown> = {
          [TYPE]: TYPE_ITEM,
          data: value.data,
          items: value.items,
          [TOKENS]: tokens,
        };

        return (cache[prop] = item);
      }

      if (isCssInstance(value)) {
        return (cache[prop] = createCssInstanceTokenWrapper(value, tokens!));
      }

      return value;
    },
  };
}

function resolveItems(
  data: StyleData | SlotData,
  scopes: readonly ScopeTargetData[],
) {
  const items: StateItem[] = [];

  const state = data[BUILDER_STATE];
  const stateItems = state?.items ?? [];
  const slotId = isSlotData(data) ? getSlotId(data) : null;

  for (let i = 0, len = stateItems.length; i < len; i++) {
    const item = stateItems[i];

    if (Array.isArray(item)) {
      items.push(item);
      continue;
    }

    if (slotId && item.type !== BUILDER_TYPE_SLOT) continue;

    items.push(item);
  }

  if (!slotId) return items;

  for (let i = 0, len = scopes.length; i < len; i++) {
    const boundScope = scopes[i];

    const scope = getScopeTargetScope(boundScope);
    if (!scope) continue;

    const scopeItems = scope[BUILDER_STATE]?.items;
    if (!scopeItems) continue;

    const targetSlotId = getScopeTargetSlotId(boundScope);

    for (let j = 0, len = scopeItems.length; j < len; j++) {
      const item = scopeItems[j];

      if (Array.isArray(item)) {
        if (item[1] === slotId) {
          items.push(item);
        }

        if (targetSlotId === slotId && item[4] === true) {
          items.push(getScopeParentItem(item[3]));
        }

        continue;
      }

      if (item.type !== BUILDER_TYPE_SCOPE) continue;

      if (item.slotId === slotId) items.push(item);

      if (item.parentSelector && targetSlotId === slotId) {
        items.push(getScopeParentItem(item.className));
      }
    }
  }

  return items;
}

function getScopeParentItem(className: string): StateItem {
  const parentClassName = getScopeParentClassName(className);

  return [parentClassName, parentClassName];
}

type InferValue<Value> = Value extends StyleData | SlotData ? CssResolvedItem<Value>
  : CssInstance<Value>;

type InferData<Styles> = unknown extends Styles ? {}
  : Styles extends object ? { [P in keyof Styles]: InferValue<Styles[P]>; }
  : {};
