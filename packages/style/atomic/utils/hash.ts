import { globalData } from '../../utils/global';
import { hashString, normalizeHashLength } from '../../utils/hash';

type PooledHashState = {
  byValue: Map<string, string>;
  byHash: Map<string, string>;
  usedByLength: number[];
};

const POOLED_HASH_STATE = globalData<PooledHashState>(
  'atomic.hashPool',
  () => ({
    byValue: new Map(),
    byHash: new Map(),
    usedByLength: [],
  }),
);

export function getIdentifierSafeHash(value: string, startLength = 7) {
  return getPooledHash(value, startLength);
}

function getPooledHash(value: string, startLength: number) {
  const normalizedStartLength = normalizeHashLength(startLength);
  const valueKey = normalizedStartLength + '\0' + value;
  const existing = POOLED_HASH_STATE.byValue.get(valueKey);
  if (existing) return existing;

  let length = normalizedStartLength;

  while (true) {
    if (getPooledHashUsedCount(length) >= getIdentifierSafeHashPoolSize(length)) {
      length++;
      continue;
    }

    for (let index = 0; index < getIdentifierSafeHashPoolSize(length); index++) {
      const hash = getPooledHashCandidate(value, length, index);
      const owner = POOLED_HASH_STATE.byHash.get(hash);

      if (owner !== undefined && owner !== valueKey) continue;

      POOLED_HASH_STATE.byValue.set(valueKey, hash);
      POOLED_HASH_STATE.byHash.set(hash, valueKey);
      POOLED_HASH_STATE.usedByLength[length] = getPooledHashUsedCount(length) + 1;
      return hash;
    }

    length++;
  }
}

function getPooledHashCandidate(
  value: string,
  length: number,
  index: number,
) {
  const hashValue = index === 0 ? value : value + '::' + index;
  return getIdentifierSafeHashValue(hashString(hashValue)).slice(0, length);
}

function getPooledHashUsedCount(length: number) {
  return POOLED_HASH_STATE.usedByLength[length] ?? 0;
}

function getIdentifierSafeHashPoolSize(length: number) {
  if (length <= 0) return 0;

  return 26 * 36 ** (length - 1);
}

function getIdentifierSafeHashValue(hash: string) {
  const first = hash.charCodeAt(0);

  if (first < 48 || first > 57) return hash;

  return String.fromCharCode(97 + first - 48) + hash.slice(1);
}
