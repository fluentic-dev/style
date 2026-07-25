import type { StyleTokenOverride } from '../../style/token';
import { BUILDER_STATE, BUILDER_TYPE_SHEET } from '../data/const';
import type { SheetData } from '../data/data';
import type { ExtractedItemValue } from '../data/state';
import { createExtractedData, normalizeExtractedItems } from './utils';

export type ExtractedSheetTuple = [
  dedupe: string,
  className: string,
  value?: ExtractedItemValue,
];

export type ExtractedSheetItem = ExtractedSheetTuple | StyleTokenOverride;

export function createExtractedSheet(items: ExtractedSheetItem[]): SheetData {
  const data = createExtractedData(BUILDER_TYPE_SHEET) as unknown as SheetData;
  const normalizedItems = items.filter((item): item is ExtractedSheetTuple => Array.isArray(item));
  const tokenItems = items.filter((item): item is StyleTokenOverride => !Array.isArray(item));

  data[BUILDER_STATE].items = [
    ...tokenItems,
    ...normalizeExtractedItems(BUILDER_TYPE_SHEET, null, normalizedItems),
  ];

  return data;
}
