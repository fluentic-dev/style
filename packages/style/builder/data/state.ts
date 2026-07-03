import type { StyleTokenData, StyleTokenOverride } from '../../style/token';
import type { AtRuleRefData } from '../../style/valueRef';
import type { UniqueSymbol } from '../../utils/type';
import type {
  BUILDER_TYPE_SCOPE,
  BUILDER_TYPE_SLOT,
  BUILDER_TYPE_SLOT_OVERRIDE,
  BUILDER_TYPE_STYLE,
  BUILDER_TYPE_THEME,
  ITEM_RUNTIME_DEV,
  ITEM_RUNTIME_DEV_PLUGIN,
  ITEM_RUNTIME_PROD,
  ITEM_RUNTIME_PROD_PLUGIN,
  ITEM_VALUE_NUMBER_PX,
  ITEM_VALUE_TYPE_AT_RULE_REF,
  ITEM_VALUE_TYPE_STYLE_DATA,
  ITEM_VALUE_TYPE_VARIABLE,
} from './const';
import type { BuilderCallsite } from './data';
import type { DebugData } from './debug';

export type BuilderType =
  | typeof BUILDER_TYPE_STYLE
  | typeof BUILDER_TYPE_SLOT
  | typeof BUILDER_TYPE_SLOT_OVERRIDE
  | typeof BUILDER_TYPE_SCOPE
  | typeof BUILDER_TYPE_THEME;

export type ExtractedItemValueMode = typeof ITEM_VALUE_NUMBER_PX;

export type ItemRuntimeType =
  | typeof ITEM_RUNTIME_DEV
  | typeof ITEM_RUNTIME_DEV_PLUGIN
  | typeof ITEM_RUNTIME_PROD
  | typeof ITEM_RUNTIME_PROD_PLUGIN;

export type ExtractedItemValue =
  | [type: typeof ITEM_VALUE_TYPE_VARIABLE, variable: string, value: unknown, valueMode?: ExtractedItemValueMode]
  | [type: typeof ITEM_VALUE_TYPE_STYLE_DATA, data: ExtractedStyleItem[]]
  | [type: typeof ITEM_VALUE_TYPE_AT_RULE_REF, ref: AtRuleRefData];

export type ExtracteItemData = [
  dedupe: string,
  className: string,
  value?: ExtractedItemValue,
];

export type ExtractedStyleItem = ExtracteItemData | [
  type: typeof BUILDER_TYPE_STYLE,
  ...ExtracteItemData,
];

export type ExtractedSlotItem = ExtracteItemData | [
  type: typeof BUILDER_TYPE_SLOT,
  slotId: string,
  ...ExtracteItemData,
];

export type ExtractedSlotOverrideItem = ExtracteItemData | [
  type: typeof BUILDER_TYPE_SLOT_OVERRIDE,
  slotId: string,
  ...ExtracteItemData,
];

export type ExtractedScopeItem = [
  type: typeof BUILDER_TYPE_SCOPE,
  slotId: string,
  dedupe: string,
  className: string,
  valueOrHasParentSelector?: 1 | ExtractedItemValue,
  hasParentSelector?: 1,
];

export type RuntimeItemData = {
  runtime: ItemRuntimeType;
  callsite: BuilderCallsite | null;
  debug: DebugData | null;
  debugField: string | null;
  dedupe: string;
  className: string;
  property: string;
  value: ItemValue;
  variable?: ExtractedItemValue;
  token?: StyleTokenData | null;
  selector: ItemSelector | null;
  atRule: ItemSelector[] | null;
};

export type RuntimeStyleItem = RuntimeItemData & {
  type: typeof BUILDER_TYPE_STYLE;
};

export type RuntimeSlotItem = RuntimeItemData & {
  type: typeof BUILDER_TYPE_SLOT;
  slotId: string;
};

export type RuntimeSlotOverrideItem = RuntimeItemData & {
  type: typeof BUILDER_TYPE_SLOT_OVERRIDE;
  slotId: string;
};

export type RuntimeScopeItem = RuntimeItemData & {
  type: typeof BUILDER_TYPE_SCOPE;
  slotId: string;
  parentSelector: ItemSelector | null;
};

export type ExtractedItem =
  | ExtractedStyleItem
  | ExtractedSlotItem
  | ExtractedSlotOverrideItem
  | ExtractedScopeItem;

export type RuntimeItem =
  | RuntimeStyleItem
  | RuntimeSlotItem
  | RuntimeSlotOverrideItem
  | RuntimeScopeItem;

export type ItemSelector = string | [selector: string, priority: number];

export type ItemValue = string | [value: string, priority: number];

export type StateItem = ExtractedItem | RuntimeItem | StyleTokenOverride;

export type StateLookup = Record<string, /* key */ number /* index */>;

export type BuilderState<Style> = {
  [UniqueSymbol]?: Style;
  //
  items: StateItem[];
  lookup?: StateLookup;
};
