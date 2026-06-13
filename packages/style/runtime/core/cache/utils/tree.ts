export type CacheTreeNode<Key, Value> = {
  children: Map<Key, CacheTreeNode<Key, Value>>;
  value: Value;
};

export type WeakCacheTreeNode<Key extends object, Value> = {
  children: WeakMap<Key, WeakCacheTreeNode<Key, Value>>;
  value: Value;
};

export function createCacheTreeNode<Key, Value>(
  value: Value,
): CacheTreeNode<Key, Value> {
  return {
    children: new Map(),
    value,
  };
}

export function getCacheTreeChild<Key, Value>(
  node: CacheTreeNode<Key, Value>,
  key: Key,
  createValue: () => Value,
) {
  let child = node.children.get(key);

  if (!child) {
    child = createCacheTreeNode<Key, Value>(createValue());
    node.children.set(key, child);
  }

  return child;
}

export function createWeakCacheTreeNode<Key extends object, Value>(
  value: Value,
): WeakCacheTreeNode<Key, Value> {
  return {
    children: new WeakMap(),
    value,
  };
}

export function getWeakCacheTreeChild<Key extends object, Value>(
  node: WeakCacheTreeNode<Key, Value>,
  key: Key,
  createValue: () => Value,
) {
  let child = node.children.get(key);

  if (!child) {
    child = createWeakCacheTreeNode<Key, Value>(createValue());
    node.children.set(key, child);
  }

  return child;
}
