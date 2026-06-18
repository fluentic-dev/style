import type { ScopeTargetData } from '../../../builder/data/data';
import { getScopeTargetScope, getScopeTargetSlotId, isScopeTargetData } from '../../../builder/data/is';
import { RUNTIME_CONFIG } from '../../../config/config/runtime';
import type { Falsy, StyleItem } from '../../types';
import type { CombinedStyle } from '../combinedStyle';
import { createCombinedStyleFacade } from './item';
import { addTokenOverride, createMutableTokenValues, finishTokenValues, type StyleTokenValues } from './tokenValues';
import { type CacheTreeNode, createCacheTreeNode, getCacheTreeChild } from './utils/tree';

export type CombinedStylePool = {
  get<Styles extends object>(
    styles: Styles,
    inheritedScopes: readonly (ScopeTargetData<any> | Falsy)[],
    items: readonly (StyleItem | Falsy)[],
    prevTokensData?: StyleTokenValues | null,
  ): CombinedStylePoolResult<Styles>;
  cleanup(now?: number): void;
};

export type CombinedStylePoolResult<Styles = unknown> = {
  style: CombinedStyle<Styles>;
  tokensData: StyleTokenValues | null;
  isTokenDataChanged: boolean;
};

type PoolValue = {
  style: CombinedStyle | null;
  updatedAt: number;
};

type PoolNode = CacheTreeNode<unknown, PoolValue>;

const DEFAULT_TTL = 1000 * 60 * 5;

let configuredPool: CombinedStylePool | null = null;
let configuredPoolTTL = -1;

export function getCombinedStylePool() {
  const ttl = RUNTIME_CONFIG.runtimeCacheTTL;

  if (
    !configuredPool ||
    configuredPoolTTL !== ttl
  ) {
    configuredPool = createCombinedStylePool(ttl);
    configuredPoolTTL = ttl;
  }

  return configuredPool;
}

export function createCombinedStylePool(ttl = DEFAULT_TTL): CombinedStylePool {
  const root = createPoolNode();
  let timer: ReturnType<typeof setTimeout> | null = null;

  return {
    get(styles, inheritedScopes, items, prevTokensData = null) {
      if (ttl === 0) {
        const collected = collectItems(items, prevTokensData);
        const allScopes = concatScopes(inheritedScopes, collected.scopes);

        return {
          style: createCombinedStyleFacade(styles, allScopes) as CombinedStyle<typeof styles>,
          tokensData: collected.tokensData,
          isTokenDataChanged: collected.isTokenDataChanged,
        };
      }

      const now = Date.now();
      let node = getPoolChild(root, styles);
      const collected = collectItems(items, prevTokensData);

      node = walkScopes(node, inheritedScopes);
      node = walkScopes(node, collected.scopes);
      node.value.updatedAt = now;

      if (node.value.style) {
        scheduleCleanup();
        return {
          style: node.value.style as CombinedStyle<typeof styles>,
          tokensData: collected.tokensData,
          isTokenDataChanged: collected.isTokenDataChanged,
        };
      }

      const allScopes = concatScopes(inheritedScopes, collected.scopes);

      node.value.style = createCombinedStyleFacade(styles, allScopes);

      scheduleCleanup();

      return {
        style: node.value.style as CombinedStyle<typeof styles>,
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
  prevTokensData: StyleTokenValues | null,
) {
  const scopes: ScopeTargetData[] = [];
  const tokens = createMutableTokenValues(prevTokensData);

  for (let i = 0, len = items.length; i < len; i++) {
    const item = items[i];

    if (addTokenOverride(tokens, item)) continue;

    if (isScopeTargetData(item)) {
      scopes.push(item);
    }
  }

  const tokensData = finishTokenValues(prevTokensData, tokens);

  if (!tokensData) {
    return {
      scopes,
      tokensData: null,
      isTokenDataChanged: !!prevTokensData,
    };
  }

  return {
    scopes,
    tokensData,
    isTokenDataChanged: tokensData !== prevTokensData,
  };
}

function walkScopes(
  node: PoolNode,
  scopes: readonly (ScopeTargetData | Falsy)[],
) {
  for (let i = 0, len = scopes.length; i < len; i++) {
    const scope = scopes[i];
    if (!scope) continue;

    node = getPoolChild(node, getScopeTargetScope(scope));
    node = getPoolChild(node, getScopeTargetSlotId(scope));
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

function getPoolChild(node: PoolNode, key: unknown) {
  return getCacheTreeChild(node, key, createPoolValue);
}

function createPoolNode(): PoolNode {
  return createCacheTreeNode<unknown, PoolValue>(createPoolValue());
}

function createPoolValue(): PoolValue {
  return {
    style: null,
    updatedAt: Date.now(),
  };
}

function cleanupNode(node: PoolNode, now: number, ttl: number) {
  for (const [key, child] of node.children) {
    cleanupNode(child, now, ttl);

    if (child.value.style && now - child.value.updatedAt >= ttl) {
      child.value.style = null;
    }

    if (!child.value.style && !child.children.size) {
      node.children.delete(key);
    }
  }
}
