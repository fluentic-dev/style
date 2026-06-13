import type { CssProp } from '../../types';
import type { ResolvedCssProp } from './result';
import {
  createWeakCacheTreeNode,
  getWeakCacheTreeChild,
  type WeakCacheTreeNode,
} from './utils/tree';

type CacheValue = {
  data: CssPropCacheData<object> | null;
};

type CacheNode<Item extends object> = WeakCacheTreeNode<Item, CacheValue>;

export type CssPropCacheData<Item extends object> = {
  configVersion: number;
  items: Item[];
  result: ResolvedCssProp;
};

const root = createWeakCacheTreeNode<object, CacheValue>(createCacheValue());

export function getCssPropCacheValue<Item extends object>(
  css: CssProp,
  walk: (
    css: CssProp,
    fn: (item: object) => void,
    onUnsupported: () => void,
  ) => void,
  onUnsupported?: () => void,
) {
  let node = root as CacheNode<object>;
  let hasItem = false;
  let canCache = true;

  walk(
    css,
    (item) => {
      hasItem = true;
      node = getWeakCacheTreeChild(node, item, createCacheValue);
    },
    () => {
      canCache = false;
      onUnsupported?.();
    },
  );

  return hasItem && canCache
    ? node.value as CacheValue & { data: CssPropCacheData<Item> | null }
    : null;
}

function createCacheValue(): CacheValue {
  return {
    data: null,
  };
}
