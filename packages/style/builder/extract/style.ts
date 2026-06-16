import { BUILDER_STATE, BUILDER_TYPE_STYLE } from '../data/const';
import type { StyleData } from '../data/data';
import type { ExtractedItemValue } from '../data/state';
import { createExtractedData, normalizeExtractedItems } from './utils';

export type ExtractedStyleTuple = [
  dedupe: string,
  className: string,
  value?: ExtractedItemValue,
];

export function createExtractedStyle(items: ExtractedStyleTuple[]): StyleData {
  const data = createExtractedData(BUILDER_TYPE_STYLE) as unknown as StyleData;

  data[BUILDER_STATE].items = normalizeExtractedItems(BUILDER_TYPE_STYLE, null, items);

  return data;
}
