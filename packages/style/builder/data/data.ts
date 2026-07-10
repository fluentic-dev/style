import type { StyleTokenOverride } from '../../style/token';
import type { TraceCallsite } from '../../utils/trace';
import type {
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
import type { BuilderState } from './state';

export type BuilderCallsite = TraceCallsite;

export type BuilderData<Style = unknown, Type = unknown> = {
  [BUILDER_TYPE]: Type;
  [BUILDER_STATE]: BuilderState<Style>;
  [BUILDER_CALLSITE]: BuilderCallsite | null;
};

export type AnyBuilderData<Style = unknown> =
  | StyleData<Style>
  | SlotData<Style>
  | SlotOverrideData<Style>
  | ScopeData
  | ScopeTargetData
  | ThemeData;

export type StyleData<Style = unknown> =
  & BuilderData<Style, typeof BUILDER_TYPE_STYLE>
  & {};

export type SlotData<Style = unknown> =
  & BuilderData<Style, typeof BUILDER_TYPE_SLOT>
  & { [BUILDER_SLOT_ID]: string; };

export type SlotOverrideData<Style = unknown> =
  & BuilderData<Style, typeof BUILDER_TYPE_SLOT_OVERRIDE>
  & { [BUILDER_SLOT_ID]: string; };

export type ScopeData =
  & BuilderData<unknown, typeof BUILDER_TYPE_SCOPE>
  & {
    (slot: SlotData<any>): ScopeTargetData;
  };

export type ScopeTargetData = {
  [BUILDER_TYPE]: typeof BUILDER_TYPE_SCOPE_TARGET;
  [BUILDER_SCOPE]: ScopeData;
  [BUILDER_SCOPE_ID]: string;
};

export type ThemeData = BuilderData<unknown, typeof BUILDER_TYPE_THEME> & {
  id: string;
  className: string;
  tokens: readonly StyleTokenOverride[];
};
