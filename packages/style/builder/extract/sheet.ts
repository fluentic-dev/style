import type { StyleTokenOverride } from '../../style/token';
import { BUILDER_SHEET_OPTIONS, BUILDER_STATE, BUILDER_TYPE_SHEET } from '../data/const';
import type { CreateSheetOptions, SheetData } from '../data/data';
import type { ExtractedItemValue } from '../data/state';
import { createExtractedData, normalizeExtractedItems } from './utils';

export type ExtractedSheetTuple = [
  dedupe: string,
  className: string,
  value?: ExtractedItemValue,
];

export type ExtractedSheetItem = ExtractedSheetTuple | StyleTokenOverride;

export function createExtractedSheet(
  items: ExtractedSheetItem[],
  options: CreateSheetOptions = {},
): SheetData {
  const data = createExtractedData(BUILDER_TYPE_SHEET) as unknown as SheetData;
  data[BUILDER_SHEET_OPTIONS] = options;
  const normalizedItems = items.filter((item): item is ExtractedSheetTuple => Array.isArray(item));
  const tokenItems = items.filter((item): item is StyleTokenOverride => !Array.isArray(item));

  data[BUILDER_STATE].items = [
    ...tokenItems,
    ...normalizeExtractedItems(BUILDER_TYPE_SHEET, null, normalizedItems),
  ];

  return data;
}
