import { RUNTIME_CONFIG } from '../../config';
import { createCssInstancePool, createCssInstanceTokenWrapper, type CssInstance } from '../instance';
import type { StyleItems } from '../types';

type GetCssArg = StyleItems[number] | StyleItems;

let pool: ReturnType<typeof createCssInstancePool> | null = null;
let poolTTL = -1;

export function getCss<T extends object>(
  styles: T,
  ...args: GetCssArg[]
): CssInstance<T> {
  const result = getPool().get(styles, [], normalizeStyleItems(args));
  return result.tokensData
    ? createCssInstanceTokenWrapper(result.instance, result.tokensData)
    : result.instance;
}

function getPool() {
  const ttl = RUNTIME_CONFIG.cssCacheTTL;

  if (!pool || poolTTL !== ttl) {
    pool = createCssInstancePool(ttl);
    poolTTL = ttl;
  }

  return pool;
}

function normalizeStyleItems(itemsOrList: GetCssArg[]): StyleItems {
  if (itemsOrList.length === 1 && Array.isArray(itemsOrList[0])) return itemsOrList[0];

  const result: StyleItems = [];

  for (let i = 0, len = itemsOrList.length; i < len; i++) {
    const item = itemsOrList[i];
    if (!item) continue;

    if (Array.isArray(item)) {
      for (let j = 0, itemLen = item.length; j < itemLen; j++) {
        const child = item[j];
        if (child) result.push(child);
      }
    } else {
      result.push(item);
    }
  }

  return result;
}
