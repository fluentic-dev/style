import type { PriorityMode, SourcemapTraceMode } from '../config';

const StoragePrefix = '@fluentic/style.dev';

export const DefaultUtilsName = 'StyleDevUtils';

export const StorageKeys = {
  priorityMode: StoragePrefix + '.priorityMode',
  sourcemapTrace: StoragePrefix + '.sourcemapTrace',
  elementMarker: StoragePrefix + '.elementMarker',
  startupMessage: StoragePrefix + '.startupMessage',
};

export function createDevUtilsObject<T extends Record<string, unknown>>(object: T): T {
  return Object.assign(Object.create(null), object);
}

export function getDevUtilsTarget(): Record<string, unknown> {
  return typeof globalThis.window === 'undefined'
    ? globalThis
    : globalThis.window as {};
}

export function getStorage(): Storage | null {
  try {
    return typeof globalThis.localStorage === 'undefined'
      ? null
      : globalThis.localStorage;
  } catch {
    return null;
  }
}

export function getStoredItem(storage: Storage, key: string) {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

export function setStoredItem(storage: Storage, key: string, value: string) {
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeStoredItem(storage: Storage, key: string) {
  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function parsePriorityMode(value: string | null): PriorityMode | null {
  return value === 'layer' || value === 'sort' ? value : null;
}

export function parseSourcemapTrace(value: string | null): SourcemapTraceMode | null {
  return value === 'style' || value === 'value' ? value : null;
}

export function getTraceStartMessage() {
  const items = [
    'O_o [ tracing... ]',
    '(-_-) [ mapping... ]',
    '(^_-) [ decoding... ]',
    'p(^_^)q [ hunting... ]',
    'B-) [ analyzing... ]',
  ];

  const index = Math.floor(Math.random() * items.length);

  return items[index];
}
