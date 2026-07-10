import type { AtRuleRef, PlainStyleObject, StyleKeyframesObject, StyleObject, StyleValueTuple } from '../../style';
import type { Collapse } from '../../utils/type';
import type { BUILDER_SLOT_ID } from '../data';
import type { ScopeSelfFn, SlotSelfFn, StyleSelfFn } from './fns';
import type { MergeRuleStyleData } from './types';
import type { ScopeBuilder, SlotBuilder, SlotOverrideBuilder, StyleBuilder } from './types';

type _ = typeof BUILDER_SLOT_ID;

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

export function scopeRule<Selectors>() {
  type ScopeRule = ScopeBuilder<Selectors> & Collapse;
  return {} as ScopeRule;
}

export function typeAliases<Style, Selectors>() {
  type Selector = Selectors & Collapse;

  type StyleRule<Style> = ReturnType<typeof styleRule<Style, Selectors>>;
  type SlotRule<Style> = ReturnType<typeof slotRule<Style, Selectors>>;
  type SlotOverrideRule<Style> = ReturnType<typeof slotOverrideRule<Style, Selectors>>;
  type ScopeRule = ReturnType<typeof scopeRule<Selectors>>;

  type StyleFn<Style> = StyleSelfFn<Style, Selectors> & {
    (style?: StyleObject<Style>): ReturnType<typeof styleRule<Style, Selectors>>;
    slot: SlotFn<Style>;
    scope: ScopeFn;
    value: ValueFn;
    raw: RawFn<Style>;
    plain: PlainFn<Style>;
    keyframes: KeyframesFn<Style>;
    merge: MergeFn;
  };

  type ValueFn = <const T>(value: T, weight: number) => StyleValueTuple<T>;

  type RawFn<Style> = <T extends StyleObject<Style>>(style: T) => T;

  type PlainFn<Style> = <T extends PlainStyleObject<Style>>(style: T) => T;

  type KeyframesFn<Style> = <T extends StyleKeyframesObject<Style>>(frames: T) => AtRuleRef;

  type MergeFn = <Target>(target: Target, ...styles: MergeRuleStyleData[]) => Target;

  type SlotFn<Style> = SlotSelfFn<Style, Selectors>;

  type ScopeFn =
    & ScopeSelfFn<Selectors>
    & ScopeBuilder<Selector>;

  type Types<Style> = {
    StyleRule: StyleRule<Style>;
    SlotRule: SlotRule<Style>;
    SlotOverrideRule: SlotOverrideRule<Style>;
    ScopeRule: ScopeRule;
    //
    StyleFn: StyleFn<Style>;
    SlotFn: SlotFn<Style>;
    ScopeFn: ScopeFn;
    //
    ValueFn: ValueFn;
    RawFn: RawFn<Style>;
    PlainFn: PlainFn<Style>;
    KeyframesFn: KeyframesFn<Style>;
    MergeFn: MergeFn;
  };

  return {} as Types<Style>;
}
