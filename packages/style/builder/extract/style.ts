import { BUILDER_STATE, BUILDER_TYPE_STYLE } from '../data/const';
import type { StyleData } from '../data/data';
import type { ExtractedItemValue, RuntimeStyleItem } from '../data/state';
import { createExtractedData, normalizeExtractedItems } from './utils';

export type ExtractedStyleTuple = [
  dedupe: string,
  className: string,
  value?: ExtractedItemValue,
];

export type ExtractedStyleMergePart = ExtractedStyleTuple[] | StyleData;

export function createExtractedStyle(items: ExtractedStyleTuple[]): StyleData {
  const data = createExtractedData(BUILDER_TYPE_STYLE) as unknown as StyleData;

  data[BUILDER_STATE].items = normalizeExtractedItems(BUILDER_TYPE_STYLE, null, items);

  return data;
}

export function createExtractedStyleMerge(
  ...parts: ExtractedStyleMergePart[]
): StyleData {
  const merged: ExtractedStyleTuple[] = [];

  let i = 0;
  while (i < parts.length) {
    const part = parts[i];
    if (Array.isArray(part)) {
      appendExtractedStyleTuples(merged, part);
    } else {
      appendExtractedStyleTuples(merged, getExtractedStyleItems(part));
    }
    i++;
  }

  return createExtractedStyle(merged);
}

export function getExtractedStyleItems(style: StyleData): ExtractedStyleTuple[] {
  const items = style[BUILDER_STATE]?.items ?? [];
  const result: ExtractedStyleTuple[] = [];

  let i = 0;
  while (i < items.length) {
    const item = items[i];
    if (Array.isArray(item)) {
      const startsWithType = item[0] === BUILDER_TYPE_STYLE;
      const dedupe = String(startsWithType ? item[1] : item[0]);
      const className = String(startsWithType ? item[2] : item[1]);
      const value = startsWithType ? item[3] : item[2];

      result.push(
        value === undefined
          ? [dedupe, className]
          : [dedupe, className, value as ExtractedItemValue],
      );
      i++;
      continue;
    }

    if (!('type' in item) || item.type !== BUILDER_TYPE_STYLE) {
      i++;
      continue;
    }

    const runtimeItem = item as RuntimeStyleItem;
    result.push(
      runtimeItem.variable === undefined
        ? [runtimeItem.dedupe, runtimeItem.className]
        : [runtimeItem.dedupe, runtimeItem.className, runtimeItem.variable],
    );
    i++;
  }

  return result;
}

function appendExtractedStyleTuples(
  target: ExtractedStyleTuple[],
  source: ExtractedStyleTuple[],
) {
  let i = 0;
  while (i < source.length) {
    target.push(source[i]);
    i++;
  }
}
