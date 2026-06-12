import type { StyleTokenOverride } from '../../style/token';
import {
  BUILDER_CALLSITE,
  BUILDER_SCOPE,
  BUILDER_SCOPE_ID,
  BUILDER_SLOT_ID,
  BUILDER_STATE,
  BUILDER_TYPE,
  BUILDER_TYPE_SCOPE,
  BUILDER_TYPE_SCOPE_TARGET,
  BUILDER_TYPE_SLOT,
  BUILDER_TYPE_SLOT_OVERRIDE,
  BUILDER_TYPE_STYLE,
  BUILDER_TYPE_THEME,
} from './const';
import type {
  BuilderCallsite,
  BuilderData,
  ScopeData,
  ScopeTargetData,
  SlotData,
  SlotOverrideData,
  StyleData,
  ThemeData,
} from './data';

export function createStyleData<Style>(
  callsite: BuilderCallsite | null,
): StyleData<Style> {
  return {
    [BUILDER_TYPE]: BUILDER_TYPE_STYLE,
    [BUILDER_STATE]: { items: [], lookup: {} },
    [BUILDER_CALLSITE]: callsite,
  };
}

export function createSlotData<Style>(
  callsite: BuilderCallsite | null,
  slotId: string,
): SlotData<Style> {
  return {
    [BUILDER_TYPE]: BUILDER_TYPE_SLOT,
    [BUILDER_STATE]: { items: [], lookup: {} },
    [BUILDER_CALLSITE]: callsite,
    [BUILDER_SLOT_ID]: slotId,
  };
}

export function createSlotOverrideData<Style>(
  callsite: BuilderCallsite | null,
  slotId: string,
): SlotOverrideData<Style> {
  return {
    [BUILDER_TYPE]: BUILDER_TYPE_SLOT_OVERRIDE,
    [BUILDER_STATE]: { items: [], lookup: {} },
    [BUILDER_CALLSITE]: callsite,
    [BUILDER_SLOT_ID]: slotId,
  };
}

export function createScopeData<Style>(
  callsite: BuilderCallsite | null,
): BuilderData<Style, typeof BUILDER_TYPE_SCOPE> {
  return {
    [BUILDER_TYPE]: BUILDER_TYPE_SCOPE,
    [BUILDER_STATE]: { items: [], lookup: {} },
    [BUILDER_CALLSITE]: callsite,
  };
}

export function createScopeTargetData<Style>(
  scope: ScopeData<Style>,
  slot: SlotData<Style>,
): ScopeTargetData<Style> {
  return {
    [BUILDER_TYPE]: BUILDER_TYPE_SCOPE_TARGET,
    [BUILDER_SCOPE]: scope,
    [BUILDER_SCOPE_ID]: slot[BUILDER_SLOT_ID],
  };
}

export function createThemeData(
  callsite: BuilderCallsite | null,
  id: string,
  className: string,
  tokens: readonly StyleTokenOverride[],
): ThemeData {
  return {
    [BUILDER_TYPE]: BUILDER_TYPE_THEME,
    [BUILDER_STATE]: { items: [], lookup: {} },
    [BUILDER_CALLSITE]: callsite,
    id,
    className,
    tokens,
  };
}
