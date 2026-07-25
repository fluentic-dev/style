import {
  BUILDER_CALLSITE,
  BUILDER_STATE,
  BUILDER_TYPE,
  BUILDER_TYPE_STYLE,
  createSheetData,
  type DebugData,
  getSelectorSelectors,
  isSelectorData,
  isSelectorOverrideData,
  type SelectorData,
  type SelectorOverrideData,
  type SheetData,
  type StyleData,
} from '../builder/data';
import { mergeSheetData } from '../builder/style_data';
import { resolveCallsite } from '../builder/utils';
import { getStyleTokenId, isStyleTokenOverrideData, type StyleTokenOverride } from '../style/token';

type SheetItem<Style = unknown> =
  | false
  | null
  | undefined
  | StyleTokenOverride
  | SelectorData<Style>
  | SelectorOverrideData<Style>
  | readonly SheetItem<Style>[];

export type SheetBuilder<Style = unknown> = SheetData<Style>;

export function createSheet<Style = unknown>(
  items?: SheetItem<Style>,
  debug?: DebugData,
): SheetBuilder<Style> {
  const callsite = resolveCallsite(debug);
  let data = createSheetData<Style>(callsite);

  if (items) {
    data = mergeSheetItems(data, callsite, items);
  }

  return data;
}

function mergeSheetItems<Style>(
  data: SheetData<Style>,
  callsite: ReturnType<typeof resolveCallsite>,
  items: SheetItem<Style>,
): SheetData<Style> {
  if (!items) return data;

  if (Array.isArray(items)) {
    let next = data;

    for (let i = 0, len = items.length; i < len; i++) {
      next = mergeSheetItems(next, callsite, items[i]);
    }

    return next;
  }

  if (isStyleTokenOverrideData(items)) {
    addSheetTokenOverride(data, items);
    return data;
  }

  if (!isSelectorData(items) && !isSelectorOverrideData(items)) {
    throw new Error('createSheet(items) requires selector items from style.selector(...) or token overrides');
  }

  const selectorItem = items as SelectorData<Style> | SelectorOverrideData<Style>;
  const selectors = getSelectorSelectors(selectorItem);
  let next = data;

  if (isSelectorData(selectorItem)) return next;

  for (let i = 0, len = selectors.length; i < len; i++) {
    next = mergeSheetData(
      next,
      callsite,
      getSelectorItemStyleData(selectorItem),
      null,
      selectors[i],
      null,
    ) as SheetData<Style>;
  }

  return next;
}

function addSheetTokenOverride<Style>(
  data: SheetData<Style>,
  item: StyleTokenOverride,
) {
  const state = data[BUILDER_STATE];
  const lookup = state.lookup ??= {};
  const lookupKey = getSheetTokenLookupKey(getStyleTokenId(item));
  const lookupIndex = lookup[lookupKey];

  if (typeof lookupIndex === 'number') {
    state.items[lookupIndex] = item;
  } else {
    lookup[lookupKey] = state.items.push(item) - 1;
  }
}

function getSelectorItemStyleData<Style>(
  data: SelectorOverrideData<Style>,
): StyleData<Style> {
  return {
    [BUILDER_TYPE]: BUILDER_TYPE_STYLE,
    [BUILDER_STATE]: data[BUILDER_STATE],
    [BUILDER_CALLSITE]: data[BUILDER_CALLSITE],
  } as StyleData<Style>;
}

function getSheetTokenLookupKey(tokenId: string) {
  return 'token\0' + tokenId;
}
