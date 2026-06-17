import { globalData } from '../../../utils/global';
import type { StyleTokenValues } from './tokenValues';

const resolvedStyleItems = globalData(
  'runtime.resolvedStyleItems',
  () => new WeakSet<object>(),
);

const resolvedStyleItemTokenValues = globalData(
  'runtime.styleItemTokenValues',
  () => new WeakMap<object, StyleTokenValues | null>(),
);

export function markResolvedStyleItem(item: object) {
  resolvedStyleItems.add(item);
}

export function isResolvedStyleItem(value: unknown): value is object {
  return !!value && typeof value === 'object' && resolvedStyleItems.has(value);
}

export function setResolvedStyleItemTokenValues(
  item: object,
  tokens: StyleTokenValues,
) {
  resolvedStyleItemTokenValues.set(item, tokens);
}

export function getResolvedStyleItemTokenValues(item: object) {
  return resolvedStyleItemTokenValues.get(item) ?? null;
}
