import type { AtRuleRef, PlainStyleObject, StyleKeyframesObject, StyleObject, StyleWeightValue } from '../../style';
import type { StyleImportantValue } from '../../style/important';
import type { Collapse } from '../../utils/type';
import type { BUILDER_SELECTOR, BUILDER_SLOT_ID } from '../data';
import type { ManualSelectorInput } from '../selector_override';
import type { ScopeSelfFn, SlotSelfFn, StyleSelfFn } from './fns';
import type { MergeRuleStyleData, SelectorOverrideStyleData } from './types';
import type {
  ScopeBuilder,
  SelectorBuilder,
  SelectorOverrideBuilder,
  SlotBuilder,
  SlotOverrideBuilder,
  StyleBuilder,
} from './types';

type _ = typeof BUILDER_SLOT_ID;
type __ = typeof BUILDER_SELECTOR;

export function styleRule<Style, Selectors>() {
  type StyleRule<Style> = StyleBuilder<Style, Selectors> & Collapse;
  return {} as StyleRule<Style>;
}

export function slotRule<Style, Selectors>() {
  type SlotRule<Style> = SlotBuilder<Style, Selectors> & Collapse;
  return {} as SlotRule<Style>;
}

export function slotOverrideRule<Style, Selectors>() {
  type SlotOverrideRule<Style> = SlotOverrideBuilder<Style, Selectors> & Collapse;
  return {} as SlotOverrideRule<Style>;
}

export function selectorOverrideRule<Style, Selectors>() {
  type SelectorOverrideRule<Style> = SelectorOverrideBuilder<Style, Selectors> & Collapse;
  return {} as SelectorOverrideRule<Style>;
}

export function scopeRule<Selectors>() {
  type ScopeRule = ScopeBuilder<Selectors> & Collapse;
  return {} as ScopeRule;
}

export function typeAliases<Style, Selectors>() {
  type Selector = Selectors & Collapse;

  type StyleRule<Style> = ReturnType<typeof styleRule<Style, Selectors>>;
  type SlotRule<Style> = ReturnType<typeof slotRule<Style, Selectors>>;
  type SlotOverrideRule<Style> = ReturnType<typeof slotOverrideRule<Style, Selectors>>;
  type SelectorOverrideRule<Style> = ReturnType<typeof selectorOverrideRule<Style, Selectors>>;
  type ScopeRule = ReturnType<typeof scopeRule<Selectors>>;

  type StyleFn<Style> = StyleSelfFn<Style, Selectors> & {
    (style?: StyleObject<Style>): ReturnType<typeof styleRule<Style, Selectors>>;
    slot: SlotFn<Style>;
    scope: ScopeFn;
    weight: ValueFn;
    important: ImportantFn;
    raw: RawFn<Style>;
    plain: PlainFn<Style>;
    keyframes: KeyframesFn<Style>;
    merge: MergeFn;
    selector: SelectorFn<Style>;
  };

  type ValueFn = <const T>(value: T, weight: number) => StyleWeightValue<T>;

  type ImportantFn = <const T>(value: T) => StyleImportantValue<T>;

  type RawFn<Style> = <T extends StyleObject<Style>>(style: T) => T;

  type PlainFn<Style> = <T extends PlainStyleObject<Style>>(style: T) => T;

  type KeyframesFn<Style> = <T extends StyleKeyframesObject<Style>>(frames: T) => AtRuleRef;

  type MergeFn = <Target>(target: Target, ...styles: MergeRuleStyleData[]) => Target;

  type SelectorFn<Style> = {
    (selector: ManualSelectorInput): SelectorBuilder<Style, Selectors>;
    (selector: ManualSelectorInput, style: SelectorOverrideStyleData<Style>): SelectorOverrideBuilder<Style, Selectors>;
  };

  type SlotFn<Style> = SlotSelfFn<Style, Selectors>;

  type ScopeFn =
    & ScopeSelfFn<Selectors>
    & ScopeBuilder<Selector>;

  type Types<Style> = {
    StyleRule: StyleRule<Style>;
    SlotRule: SlotRule<Style>;
    SlotOverrideRule: SlotOverrideRule<Style>;
    SelectorOverrideRule: SelectorOverrideRule<Style>;
    ScopeRule: ScopeRule;
    //
    StyleFn: StyleFn<Style>;
    SlotFn: SlotFn<Style>;
    ScopeFn: ScopeFn;
    //
    ValueFn: ValueFn;
    ImportantFn: ImportantFn;
    RawFn: RawFn<Style>;
    PlainFn: PlainFn<Style>;
    KeyframesFn: KeyframesFn<Style>;
    MergeFn: MergeFn;
    SelectorFn: SelectorFn<Style>;
  };

  return {} as Types<Style>;
}
