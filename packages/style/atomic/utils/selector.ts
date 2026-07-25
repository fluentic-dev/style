import { SHEET_SELECTOR_ANCHOR } from '../../builder/data/const';
import type { ItemSelector } from '../../builder/data/state';

export function getSelectorText(selector: ItemSelector): string {
  const text = Array.isArray(selector) ? selector[0] : selector;
  return stripSheetSelectorAnchor(text);
}

export function getSelectorHash(selector: ItemSelector): string {
  return Array.isArray(selector) ? selector.join('|') : selector;
}

export function getSelectorPriority(selector: ItemSelector | null): number {
  if (!selector) return 0;
  return Array.isArray(selector) ? selector[1] : 0;
}

export function hasSheetSelectorAnchor(selector: ItemSelector | null): boolean {
  const text = selector ? Array.isArray(selector) ? selector[0] : selector : '';
  return text.startsWith(SHEET_SELECTOR_ANCHOR);
}

function stripSheetSelectorAnchor(selector: string) {
  return selector.startsWith(SHEET_SELECTOR_ANCHOR)
    ? selector.slice(SHEET_SELECTOR_ANCHOR.length)
    : selector;
}
