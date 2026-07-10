import type { StyleValue } from '../../style/types';
import {
  BUILDER_SCOPE,
  BUILDER_SCOPE_ID,
  BUILDER_SLOT_ID,
  BUILDER_TYPE,
  BUILDER_TYPE_SCOPE,
  BUILDER_TYPE_SCOPE_TARGET,
  BUILDER_TYPE_SLOT,
  BUILDER_TYPE_SLOT_OVERRIDE,
  BUILDER_TYPE_STYLE,
  BUILDER_TYPE_THEME,
} from './const';
import {
  type BuilderData,
  type ScopeData,
  type ScopeTargetData,
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
