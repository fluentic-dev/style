import {
  BUILDER_CALLSITE,
  BUILDER_SHEET_OPTIONS,
  BUILDER_STATE,
  BUILDER_TYPE,
  BUILDER_TYPE_STYLE,
  createSheetData,
  type CreateSheetOptions,
  type DebugData,
  getSelectorSelectors,
  isSelectorData,
  isSelectorOverrideData,
  type SelectorData,
  type SelectorOverrideData,
  type SheetData,
  type StyleData,
} from '../builder/data';
import { setSheetSelectorOptions } from '../builder/selector_override_core';
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

export type { CreateSheetOptions } from '../builder/data';

export function createSheet<Style = unknown>(items?: SheetItem<Style>): SheetBuilder<Style>;
export function createSheet<Style = unknown>(
  options: CreateSheetOptions,
  items: SheetItem<Style>,
): SheetBuilder<Style>;
export function createSheet<Style = unknown>(
  optionsOrItems?: CreateSheetOptions | SheetItem<Style>,
  itemsOrDebug?: SheetItem<Style> | DebugData,
  debug?: DebugData,
): SheetBuilder<Style> {
  const hasOptions = isCreateSheetOptions(optionsOrItems) && arguments.length >= 2;
  const options = hasOptions ? optionsOrItems : {};
  const items = (hasOptions ? itemsOrDebug : optionsOrItems) as SheetItem<Style> | undefined;
  const resolvedDebug = hasOptions ? debug : itemsOrDebug as DebugData | undefined;

  assertCreateSheetOptions(options);
  const callsite = resolveCallsite(resolvedDebug);
  let data = createSheetData<Style>(callsite, options);

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
  const options = data[BUILDER_SHEET_OPTIONS];
  let next = data;

  if (isSelectorData(selectorItem)) return next;

  for (let i = 0, len = selectors.length; i < len; i++) {
    next = mergeSheetData(
      next,
      callsite,
      getSelectorItemStyleData(selectorItem),
      null,
      setSheetSelectorOptions(selectors[i], options),
      null,
    ) as SheetData<Style>;
  }

  return next;
}

function isCreateSheetOptions(value: unknown): value is CreateSheetOptions {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return 'layer' in value || 'weight' in value || Object.keys(value).length === 0;
}

function assertCreateSheetOptions(options: CreateSheetOptions) {
  if (options.layer !== undefined && typeof options.layer !== 'boolean') {
    throw new Error('createSheet options.layer must be a boolean');
  }

  if (options.weight !== undefined && (!Number.isInteger(options.weight) || options.weight < 1)) {
    throw new Error('createSheet options.weight must be a positive integer');
  }
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
