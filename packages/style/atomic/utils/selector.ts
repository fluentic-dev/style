import type { ItemSelector } from '../../builder/data/state';

export function getSelectorText(selector: ItemSelector): string {
  return Array.isArray(selector) ? selector[0] : selector;
}

export function getSelectorHash(selector: ItemSelector): string {
  return Array.isArray(selector) ? selector.join('|') : selector;
}

export function getSelectorPriority(selector: ItemSelector | null): number {
  if (!selector) return 0;
  return Array.isArray(selector) ? selector[1] : 0;
}
