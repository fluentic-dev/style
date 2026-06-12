import type { Selector } from '../../selector';
import type { StyleObject } from '../../style/types';
import type { DebugData, ScopeData, SlotData, SlotOverrideData, StyleData } from '../data';
import type { ScopeSelectorFns, ScopeSelfFn, SlotOverrideSelectorFns, SlotSelectorFns, StyleSelectorFns } from './fns';

export type { ScopeSelfFn };

export type MergeRuleStyleData<Style = unknown> = StyleData<Style> | StyleData<Style>[];
export type AtRuleStyleData<Style = unknown> = StyleObject<Style> | StyleData<Style>;

export type SelectorsRecord = Record<string, Selector>;

export type SelectItemFalsy = false | null | undefined;
export type SelectItems<Item> =
  | Item
  | (Item | SelectItemFalsy)[];

export type StyleBuilderFns<Style, Selectors> =
  & StyleSelectorFns<Style, Selectors>
  & {};

export type SlotBuilderFns<Style, Selectors> =
  & SlotSelectorFns<Style, Selectors>
  & {};

export type SlotOverrideBuilderFns<Style, Selectors> =
  & SlotOverrideSelectorFns<Style, Selectors>
  & {};

export type ScopeFns<Style, Selectors> =
  & ScopeSelectorFns<Style, Selectors>
  & {};

export type StyleBuilder<Style, Selectors> =
  & StyleData<Style>
  & StyleBuilderFns<Style, Selectors>;

export type SlotBuilder<Style, Selectors> =
  & SlotData<Style>
  & ((style?: StyleObject<Style>, debug?: DebugData) => SlotOverrideBuilder<Style, Selectors>)
  & SlotBuilderFns<Style, Selectors>;

export type SlotOverrideBuilder<Style, Selectors> =
  & SlotOverrideData<Style>
  & SlotOverrideBuilderFns<Style, Selectors>;

export type ScopeBuilder<Style, Selectors> =
  & ScopeData<Style>
  & ScopeFns<Style, Selectors>
  & {};
