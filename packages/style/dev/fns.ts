import type { SourcemapLocationMode, StylePriorityMode } from '../config/types';

const StoragePrefix = '@fluentic/style.dev';

export const DefaultUtilsName = 'StyleDevUtils';

export const StorageKeys = {
  priorityMode: StoragePrefix + '.priorityMode',
  sourcemapMode: StoragePrefix + '.sourcemapTrace',
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

export function parsePriorityMode(value: string | null): StylePriorityMode | null {
  return value === 'layer' || value === 'sort' ? value : null;
}

export function parseSourcemapTrace(value: string | null): SourcemapLocationMode | null {
  return value === 'style' || value === 'value' ? value : null;
}

export function parseElementMarker(value: string | null): boolean | null {
  return value ? value === 'true' : null;
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
