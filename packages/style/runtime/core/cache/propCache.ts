import { RUNTIME_CONFIG } from '../../../config/config/runtime';
import type { StyleProp } from '../../types';
import type { ResolvedStyleProp } from './result';
import { createWeakCacheTreeNode, getWeakCacheTreeChild, type WeakCacheTreeNode } from './utils/tree';

type CacheValue<Data = StylePropCacheData<object>> = {
  d: Data | null;
  c: number;
};

type CacheNode<Item extends object> = WeakCacheTreeNode<Item, CacheValue>;

export type StylePropCacheData<Item extends object> = {
  i: Item[];
  r: ResolvedStyleProp;
};

const root = createWeakCacheTreeNode<object, CacheValue>(createCacheValue());

export function getStylePropCacheValue<Item extends object, Data = StylePropCacheData<Item>>(
  styleProp: StyleProp,
  walk: (
    styleProp: StyleProp,
    fn: (item: object) => void,
    onUnsupported: () => void,
  ) => void,
  onUnsupported?: () => void,
) {
  let node = root as CacheNode<object>;
  let hasItem = false;
  let canCache = true;

  walk(
    styleProp,
    (item) => {
      hasItem = true;
      node = getWeakCacheTreeChild(node, item, createCacheValue);
    },
    () => {
      canCache = false;
      onUnsupported?.();
    },
  );

  if (!hasItem || !canCache) return null;

  const value = node.value as CacheValue<Data>;

  if (value.c !== RUNTIME_CONFIG.changes) {
    value.d = null;
    value.c = RUNTIME_CONFIG.changes;
  }

  return value;
}

function createCacheValue(): CacheValue {
  return {
    d: null,
    c: RUNTIME_CONFIG.changes,
  };
}
