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

export function getSheetSelectorWeight(selector: ItemSelector | null): number | null {
  const text = selector ? Array.isArray(selector) ? selector[0] : selector : '';
  if (!text.startsWith(SHEET_SELECTOR_ANCHOR + ':')) return null;

  const end = text.indexOf('\0', SHEET_SELECTOR_ANCHOR.length);
  if (end < 0) return null;

  const [weightValue] = text.slice(SHEET_SELECTOR_ANCHOR.length + 1, end).split(':');
  const weight = Number(weightValue);
  return Number.isInteger(weight) && weight > 0 ? weight : null;
}

function stripSheetSelectorAnchor(selector: string) {
  if (!selector.startsWith(SHEET_SELECTOR_ANCHOR)) return selector;

  if (selector.startsWith(SHEET_SELECTOR_ANCHOR + ':')) {
    const end = selector.indexOf('\0', SHEET_SELECTOR_ANCHOR.length);
    if (end >= 0) return selector.slice(end + 1);
  }

  return selector.slice(SHEET_SELECTOR_ANCHOR.length);
}
