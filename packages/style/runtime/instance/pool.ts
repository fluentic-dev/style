import { getTokenOverrideValue } from '../../atomic/token';
import { getScopeTargetScope, getScopeTargetSlotId, isScopeTargetData, type ScopeTargetData } from '../../builder/data';
import { RUNTIME_CONFIG } from '../../config';
import { getStyleTokenId, isStyleTokenOverrideData } from '../../style/token';
import type { Falsy, StyleItem } from '../types';
import { createCssInstance, type CssInstance, type CssTokenData } from './data';

type CacheNode = {
  children: Map<unknown, CacheNode>;
  instance: CssInstance | null;
  updatedAt: number;
};

export type CssInstancePool = {
  get<Styles extends object>(
    styles: Styles,
    inheritedScopes: readonly (ScopeTargetData<any> | Falsy)[],
    items: readonly (StyleItem | Falsy)[],
    prevTokensData?: CssTokenData | null,
  ): CssInstancePoolResult<Styles>;
  cleanup(now?: number): void;
};

export type CssInstancePoolResult<Styles = unknown> = {
  instance: CssInstance<Styles>;
  tokensData: CssTokenData | null;
  isTokenDataChanged: boolean;
};

const DEFAULT_TTL = 1000 * 60 * 5;

export function createCssInstancePool(ttl = DEFAULT_TTL): CssInstancePool {
  const root = createNode();
  let timer: ReturnType<typeof setTimeout> | null = null;

  return {
    get(styles, inheritedScopes, items, prevTokensData = null) {
      const now = Date.now();
      let node = getChild(root, styles);
      const collected = collectItems(items, prevTokensData);

      node = walkScopes(node, inheritedScopes);
      node = walkScopes(node, collected.scopes);
      node.updatedAt = now;

      if (node.instance) {
        scheduleCleanup();
        return {
          instance: node.instance as CssInstance<typeof styles>,
          tokensData: collected.tokensData,
          isTokenDataChanged: collected.isTokenDataChanged,
        };
      }

      const allScopes = concatScopes(inheritedScopes, collected.scopes);

      node.instance = createCssInstance(styles, allScopes);

      scheduleCleanup();

      return {
        instance: node.instance as CssInstance<typeof styles>,
        tokensData: collected.tokensData,
        isTokenDataChanged: collected.isTokenDataChanged,
      };
    },

    cleanup(now = Date.now()) {
      cleanupNode(root, now, ttl);
    },
  };

  function scheduleCleanup() {
    if (timer) return;

    timer = setTimeout(() => {
      timer = null;
      cleanupNode(root, Date.now(), ttl);
    }, Math.max(ttl, 0));

    (timer as { unref?: () => void; }).unref?.();
  }
}

function collectItems(
  items: readonly (StyleItem | Falsy)[],
  prevTokensData: CssTokenData | null,
) {
  const scopes: ScopeTargetData[] = [];
  let ids: string[] | null = null;
  let values: unknown[] | null = null;
  let lookup: Record<string, unknown> | null = null;
  let indexLookup: Record<string, number> | null = null;

  for (let i = 0, len = items.length; i < len; i++) {
    const item = items[i];
    if (!item) continue;

    if (isStyleTokenOverrideData(item)) {
      const id = getStyleTokenId(item);
      const value = getTokenOverrideValue(item, RUNTIME_CONFIG.tokenVarPrefix);
      if (!ids) ids = [];
      if (!values) values = [];
      if (!lookup) lookup = Object.create(null);
      if (!indexLookup) indexLookup = Object.create(null);

      const nextIds = ids;
      const nextValues = values;
      const nextLookup = lookup!;
      const nextIndexLookup = indexLookup!;

      const index = nextIndexLookup[id];

      if (index === undefined) {
        nextIndexLookup[id] = nextIds.push(id) - 1;
        nextValues.push(value);
      } else {
        nextValues[index] = value;
      }

      nextLookup[id] = value;
      continue;
    }

    if (isScopeTargetData(item)) {
      scopes.push(item);
    }
  }

  if (!ids || !values || !lookup) {
    return {
      scopes,
      tokensData: null,
      isTokenDataChanged: !!prevTokensData,
    };
  }

  if (isSameTokenData(prevTokensData, ids, values)) {
    return {
      scopes,
      tokensData: prevTokensData,
      isTokenDataChanged: false,
    };
  }

  return {
    scopes,
    tokensData: { ids, values, lookup },
    isTokenDataChanged: true,
  };
}

function isSameTokenData(
  prevTokensData: CssTokenData | null,
  ids: readonly string[],
  values: readonly unknown[],
) {
  if (!prevTokensData || prevTokensData.ids.length !== ids.length) return false;

  const prevLookup = prevTokensData.lookup;

  for (let i = 0, len = ids.length; i < len; i++) {
    if (!Object.prototype.hasOwnProperty.call(prevLookup, ids[i])) return false;
    if (prevLookup[ids[i]] !== values[i]) return false;
  }

  return true;
}

function walkScopes(
  node: CacheNode,
  scopes: readonly (ScopeTargetData | Falsy)[],
) {
  for (let i = 0, len = scopes.length; i < len; i++) {
    const scope = scopes[i];
    if (!scope) continue;

    node = getChild(node, getScopeTargetScope(scope));
    node = getChild(node, getScopeTargetSlotId(scope));
  }

  return node;
}

function concatScopes(
  inheritedScopes: readonly (ScopeTargetData | Falsy)[],
  scopes: readonly (ScopeTargetData | Falsy)[],
) {
  const items: ScopeTargetData[] = [];

  for (let i = 0, len = inheritedScopes.length; i < len; i++) {
    const item = inheritedScopes[i];
    if (item) items.push(item);
  }

  for (let i = 0, len = scopes.length; i < len; i++) {
    const item = scopes[i];
    if (item) items.push(item);
  }

  return items;
}

function getChild(node: CacheNode, key: unknown) {
  let child = node.children.get(key);

  if (!child) {
    child = createNode();
    node.children.set(key, child);
  }

  return child;
}

function createNode(): CacheNode {
  return {
    children: new Map(),
    instance: null,
    updatedAt: Date.now(),
  };
}

function cleanupNode(node: CacheNode, now: number, ttl: number) {
  for (const [key, child] of node.children) {
    cleanupNode(child, now, ttl);

    if (child.instance && now - child.updatedAt >= ttl) {
      child.instance = null;
    }

    if (!child.instance && !child.children.size) {
      node.children.delete(key);
    }
  }
}
