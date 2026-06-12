import { BUILDER_STATE, BUILDER_TYPE_STYLE } from '../data/const';
import { createStyleData } from '../data/create';
import type { StyleData } from '../data/data';
import type { ExtractedItemValue, ExtractedStyleItem } from '../data/state';

export type ExtractedStyleTuple = [
  dedupe: string,
  className: string,
  value?: ExtractedItemValue,
];

export function createExtractedStyle(items: ExtractedStyleTuple[]): StyleData {
  const data = createStyleData(null);

  data[BUILDER_STATE].items = normalizeStyleItems(items);

  return data;
}

function normalizeStyleItems(items: ExtractedStyleTuple[]): ExtractedStyleItem[] {
  const normalized: ExtractedStyleItem[] = [];

  let i = 0;

  while (i < items.length) {
    const item = items[i];
    const dedupe = item[0];
    const className = item[1];
    const value = item[2];

    if (value === undefined) {
      normalized.push([BUILDER_TYPE_STYLE, dedupe, className]);
    } else {
      normalized.push([BUILDER_TYPE_STYLE, dedupe, className, value]);
    }

    i++;
  }

  return normalized;
}
