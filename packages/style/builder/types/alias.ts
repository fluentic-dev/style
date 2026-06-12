import type { PlainStyleObject, StyleObject, StyleValueTuple } from '../../style';
import type { Collapse } from '../../utils/type';
// oxlint-disable-next-line no-unused-vars
import type { BUILDER_SLOT_ID } from '../data';
import type { ScopeSelfFn, SlotSelfFn, StyleSelfFn } from './fns';
import type { ScopeBuilder, SlotBuilder, SlotOverrideBuilder, StyleBuilder } from './types';

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

export function scopeRule<Style, Selectors>() {
  type ScopeRule<Style> = ScopeBuilder<Style, Selectors> & Collapse;
  return {} as ScopeRule<Style>;
}

export function typeAliases<Style, Selectors>() {
  type Selector = Selectors & Collapse;

  type StyleRule<Style> = ReturnType<typeof styleRule<Style, Selectors>>;
  type SlotRule<Style> = ReturnType<typeof slotRule<Style, Selectors>>;
  type SlotOverrideRule<Style> = ReturnType<typeof slotOverrideRule<Style, Selectors>>;
  type ScopeRule<Style> = ReturnType<typeof scopeRule<Style, Selectors>>;

  type StyleFn<Style> = StyleSelfFn<Style, Selectors> & {
    slot: SlotFn<Style>;
    scope: ScopeFn<Style>;
    priority: PriorityFn;
    raw: RawFn<Style>;
    plain: PlainFn<Style>;
  };

  type PriorityFn = <const T>(value: T, priority: number) => StyleValueTuple<T>;
  type RawFn<Style> = <const T extends StyleObject<Style>>(style: T) => T;
  type PlainFn<Style> = <const T extends PlainStyleObject<Style>>(style: T) => T;

  type SlotFn<Style> = SlotSelfFn<Style, Selectors>;

  type ScopeFn<Style> =
    & ScopeSelfFn<Style, Selectors>
    & ScopeBuilder<Style, Selector>;

  type Types<Style> = {
    StyleRule: StyleRule<Style>;
    SlotRule: SlotRule<Style>;
    SlotOverrideRule: SlotOverrideRule<Style>;
    ScopeRule: ScopeRule<Style>;
    //
    StyleFn: StyleFn<Style>;
    SlotFn: SlotFn<Style>;
    ScopeFn: ScopeFn<Style>;
    //
    PriorityFn: PriorityFn;
    RawFn: RawFn<Style>;
    PlainFn: PlainFn<Style>;
  };

  return {} as Types<Style>;
}
