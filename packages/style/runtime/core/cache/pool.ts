import { BUILDER_STATE } from '../../../builder/data/const';
import type { ScopeData, ScopeTargetData } from '../../../builder/data/data';
import { getScopeTargetScope, getScopeTargetSlotId, isScopeTargetData } from '../../../builder/data/is';
import { CSS_CONFIG } from '../../../config/config/css';
import { RUNTIME_CONFIG } from '../../../config/config/runtime';
import type { Falsy, StyleItem } from '../../types';
import type { CombinedStyle } from '../combinedStyle';
import { createCombinedStyleFacade } from './item';
import {
  addTokenOverride,
  addTokenValues,
  createMutableTokenValues,
  finishTokenValues,
  type StyleTokenValues,
} from './tokenValues';
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
  tokenCache: TokenWrapperCache | null;
  tokens: StyleTokenValues | null;
};

export type TokenWrapperCache = Map<string, CombinedStyle>;

type PoolValue = {
  style: CombinedStyle | null;
  tokenCache: TokenWrapperCache | null;
  h: boolean;
  s: StyleTokenValues | null;
  f: typeof CSS_CONFIG.tokenNameFormat;
  updatedAt: number;
};

type PoolNode = CacheTreeNode<unknown, PoolValue>;

const DEFAULT_TTL = 1000 * 60 * 5;
const TOKEN_WRAPPER_CACHE_LIMIT = 32;

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
        const collected = collectItems(null, items, prevTokensData);
        const allScopes = concatScopes(inheritedScopes, collected.scopes);

        return {
          style: createCombinedStyleFacade(styles, allScopes) as CombinedStyle<typeof styles>,
          tokenCache: null,
          tokens: collected.tokens,
        };
      }

      const now = Date.now();
      let node = getPoolChild(root, styles);

      node = walkScopes(node, inheritedScopes);

      const collected = collectItems(node, items, prevTokensData);
      node = collected.node ?? node;
      node.value.updatedAt = now;

      if (node.value.style) {
        scheduleCleanup();
        return {
          style: node.value.style as CombinedStyle<typeof styles>,
          tokenCache: collected.tokens ? getTokenWrapperCache(node.value) : null,
          tokens: collected.tokens,
        };
      }

      const allScopes = concatScopes(inheritedScopes, collected.scopes);

      node.value.style = createCombinedStyleFacade(styles, allScopes);

      scheduleCleanup();

      return {
        style: node.value.style as CombinedStyle<typeof styles>,
        tokenCache: collected.tokens ? getTokenWrapperCache(node.value) : null,
        tokens: collected.tokens,
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

export function getCachedTokenWrapper<T extends CombinedStyle>(
  cache: TokenWrapperCache | null,
  tokens: StyleTokenValues,
  create: () => T,
): T {
  if (!cache) {
    return create();
  }

  const key = getTokenWrapperCacheKey(tokens);
  const cached = cache.get(key) as T | undefined;

  if (cached) {
    cache.delete(key);
    cache.set(key, cached);
    return cached;
  }

  const value = create();
  cache.set(key, value);

  if (cache.size > TOKEN_WRAPPER_CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }

  return value;
}

function getTokenWrapperCache(node: PoolValue) {
  if (!node.tokenCache) node.tokenCache = new Map();
  return node.tokenCache;
}

function getTokenWrapperCacheKey(tokens: StyleTokenValues) {
  return tokens.ids.join('\x1f') + '\x1e' + tokens.values.join('\x1f');
}

function collectItems(
  node: PoolNode | null,
  items: readonly (StyleItem | Falsy)[],
  prevTokensData: StyleTokenValues | null,
) {
  const scopes: ScopeTargetData[] = [];
  const tokens = createMutableTokenValues(prevTokensData);
  let currentNode = node;

  for (let i = 0, len = items.length; i < len; i++) {
    const item = items[i];

    if (addTokenOverride(tokens, item)) continue;

    if (isScopeTargetData(item)) {
      scopes.push(item);
      currentNode = currentNode ? walkScope(currentNode, item) : null;
      addTokenValues(tokens, getScopeTokenValues(currentNode, getScopeTargetScope(item)));
    }
  }

  const tokensData = finishTokenValues(prevTokensData, tokens);

  if (!tokensData) {
    return {
      node: currentNode,
      scopes,
      tokens: null,
    };
  }

  return {
    node: currentNode,
    scopes,
    tokens: tokensData,
  };
}

function walkScopes(
  node: PoolNode,
  scopes: readonly (ScopeTargetData | Falsy)[],
) {
  for (let i = 0, len = scopes.length; i < len; i++) {
    const scope = scopes[i];
    if (!scope) continue;

    node = walkScope(node, scope);
  }

  return node;
}

function walkScope(
  node: PoolNode,
  scope: ScopeTargetData,
) {
  node = getPoolChild(node, getScopeTargetScope(scope));
  node = getPoolChild(node, getScopeTargetSlotId(scope));

  return node;
}

function getScopeTokenValues(
  node: PoolNode | null,
  scope: ScopeData,
) {
  const tokenNameFormat = CSS_CONFIG.tokenNameFormat;

  if (node && node.value.h && node.value.f === tokenNameFormat) {
    return node.value.s;
  }

  const values = createMutableTokenValues(null);
  const items = scope[BUILDER_STATE].items;

  for (let i = 0, len = items.length; i < len; i++) {
    addTokenOverride(values, items[i]);
  }

  const tokens = finishTokenValues(null, values);

  if (node) {
    node.value.h = true;
    node.value.s = tokens;
    node.value.f = tokenNameFormat;
  }

  return tokens;
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
    tokenCache: null,
    h: false,
    s: null,
    f: undefined,
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
