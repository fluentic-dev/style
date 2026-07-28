import { BUILDER_STATE } from '../../../builder/data/const';
import type { SheetData, SlotData, StyleData } from '../../../builder/data/data';
import { createResolvedStyleItem } from './item';
import {
  addTokenOverride,
  createMutableTokenValues,
  finishTokenValues,
  mergeTokenValues,
  type StyleTokenValues,
  type TokenValueResolver,
} from './tokenValues';

export function createResolvedStyleItemWithResolver<Data extends StyleData | SheetData | SlotData>(
  data: Data,
  tokens: StyleTokenValues | null,
  resolver: TokenValueResolver,
) {
  return createResolvedStyleItem(
    data,
    [],
    mergeTokenValues(getDataTokenValues(data, resolver), tokens),
  );
}

export function getDirectStyleItemWithResolver(
  item: StyleData | SheetData | SlotData,
  resolver: TokenValueResolver,
) {
  return createResolvedStyleItemWithResolver(item, null, resolver);
}

function getDataTokenValues(
  data: StyleData | SheetData | SlotData,
  resolver: TokenValueResolver,
) {
  const stateItems = data[BUILDER_STATE]?.items ?? [];
  const values = createMutableTokenValues(null);

  for (let i = 0, len = stateItems.length; i < len; i++) {
    addTokenOverride(values, stateItems[i], resolver);
  }

  return finishTokenValues(null, values);
}
