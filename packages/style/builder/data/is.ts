import type { StyleValue } from '../../style/types';
import {
  BUILDER_SCOPE,
  BUILDER_SCOPE_ID,
  BUILDER_SELECTOR,
  BUILDER_SLOT_ID,
  BUILDER_TYPE,
  BUILDER_TYPE_SCOPE,
  BUILDER_TYPE_SCOPE_TARGET,
  BUILDER_TYPE_SELECTOR,
  BUILDER_TYPE_SELECTOR_OVERRIDE,
  BUILDER_TYPE_SHEET,
  BUILDER_TYPE_SLOT,
  BUILDER_TYPE_SLOT_OVERRIDE,
  BUILDER_TYPE_STYLE,
  BUILDER_TYPE_THEME,
} from './const';
import {
  type BuilderData,
  type ScopeData,
  type ScopeTargetData,
  type SelectorData,
  type SelectorOverrideData,
  type SheetData,
  type SlotData,
  type SlotOverrideData,
  type StyleData,
  type ThemeData,
} from './data';

export function getSlotId(data: SlotData | SlotOverrideData) {
  return data[BUILDER_SLOT_ID];
}

export function getScopeTargetSlotId(data: ScopeTargetData) {
  return data[BUILDER_SCOPE_ID];
}

export function getScopeTargetScope(data: ScopeTargetData) {
  return data[BUILDER_SCOPE];
}

export function getSelectorSelectors(data: SelectorData | SelectorOverrideData) {
  return data[BUILDER_SELECTOR];
}

export function isStyleValue<T>(value: unknown): value is StyleValue<T> {
  return Array.isArray(value);
}

export function isStyleData<Style>(value: unknown): value is StyleData<Style> {
  return getBuilderType(value) === BUILDER_TYPE_STYLE;
}

export function isSlotData<Style>(value: unknown): value is SlotData<Style> {
  return getBuilderType(value) === BUILDER_TYPE_SLOT;
}

export function isSlotOverrideData<Style>(value: unknown): value is SlotOverrideData<Style> {
  return getBuilderType(value) === BUILDER_TYPE_SLOT_OVERRIDE;
}

export function isSelectorData<Style>(value: unknown): value is SelectorData<Style> {
  return getBuilderType(value) === BUILDER_TYPE_SELECTOR;
}

export function isSelectorOverrideData<Style>(value: unknown): value is SelectorOverrideData<Style> {
  return getBuilderType(value) === BUILDER_TYPE_SELECTOR_OVERRIDE;
}

export function isSheetData<Style>(value: unknown): value is SheetData<Style> {
  return getBuilderType(value) === BUILDER_TYPE_SHEET;
}

export function isScopeData(value: unknown): value is ScopeData {
  return getBuilderType(value) === BUILDER_TYPE_SCOPE;
}

export function isScopeTargetData(value: unknown): value is ScopeTargetData {
  return getBuilderType(value) === BUILDER_TYPE_SCOPE_TARGET;
}

export function isThemeData(value: unknown): value is ThemeData {
  return getBuilderType(value) === BUILDER_TYPE_THEME;
}

function getBuilderType(value: unknown) {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) return null;

  return (value as BuilderData)[BUILDER_TYPE];
}
