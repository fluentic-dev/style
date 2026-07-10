import type { StyleTransform } from '../style';
import type { StyleObject } from '../style/types';
import { traceMarker } from '../utils/trace';
import {
  BUILDER_CALLSITE,
  BUILDER_SLOT_ID,
  BUILDER_STATE,
  type BuilderCallsite,
  createScopeData,
  createScopeTargetData,
  createSlotData,
  createSlotOverrideData,
  createStyleData,
  type DebugData,
  getDebugCallsiteId,
  getTraceCallsiteId,
  isDebugData,
  type ScopeData,
  type SlotData,
} from './data';
import { mergeScopeData, type ScopeItems } from './data/merge/scope';
import { mergeSlotData, mergeSlotOverrideData, mergeStyleData } from './style_data';
import { createDefaultFnResult, createScopeFns, createStyleFns } from './style_fns';
import type { ScopeBuilder, SelectorsRecord, SlotBuilder, StyleBuilder } from './types';
import type { ScopeSelfFn, SlotSelfFn, StyleSelfFn } from './types/fns';
import { FnPrefixScope, FnPrefixSlot, FnPrefixStyle, resolveCallsite, transformStyle } from './utils';

export function createStyleBuilder<Style, Selectors extends SelectorsRecord>(
  selectors: Selectors,
  transform: StyleTransform<Style> | null,
) {
  type StyleFn<Style> =
    & StyleSelfFn<Style, Selectors>
    & StyleBuilder<Style, Selectors>;

  const fns = createStyleFns(
    mergeStyleData,
    selectors,
    FnPrefixStyle,
    transform,
    null,
  );

  const fn = (style?: StyleObject, debug?: DebugData) => {
    if (isDebugData(style) && debug === undefined) {
      debug = style;
      style = undefined;
    }

    const callsite = resolveCallsite(debug);

    const data = mergeStyleData(
      createStyleData(callsite),
      callsite,
      style ? transformStyle(style, transform) : null,
      debug ?? null,
      null,
      null,
    );

    return createDefaultFnResult(data, fns);
  };

  traceMarker(fn, 'style');

  return fn as unknown as StyleFn<Style>;
}

export function createSlotBuilder<Style, Selectors extends SelectorsRecord>(
  selectors: Selectors,
  transform: StyleTransform<Style> | null,
) {
  type SlotFn<Style> =
    & SlotSelfFn<Style, Selectors>
    & SlotBuilder<Style, Selectors>;

  const overrideFns = createStyleFns(
    mergeSlotOverrideData,
    selectors,
    FnPrefixSlot,
    transform,
    null,
  );

  const fns = createStyleFns(
    mergeSlotData,
    selectors,
    FnPrefixSlot,
    transform,
    (data, resultFns) => createCallableSlot(data, resultFns, overrideFns, transform),
  );

  let slotIdCounter = 0;

  const fn = (style?: StyleObject, debug?: DebugData) => {
    if (isDebugData(style) && debug === undefined) {
      debug = style;
      style = undefined;
    }

    const callsite = resolveCallsite(debug);

    let slotId: string | null = null;

    if (debug) {
      slotId = getDebugCallsiteId(debug);
    }

    if (!slotId && callsite) {
      slotId = getTraceCallsiteId(callsite);
    }

    if (!slotId) {
      slotId = (slotIdCounter++).toString();
    }

    const data = mergeSlotData(
      createSlotData(callsite, slotId),
      callsite,
      style ? transformStyle(style, transform) : null,
      debug ?? null,
      null,
      null,
    );

    return createCallableSlot(data, fns, overrideFns, transform);
  };

  traceMarker(fn, 'slot');

  return fn as unknown as SlotFn<Style>;
}

export function createScopeBuilder<Style, Selectors extends SelectorsRecord>(
  selectors: Selectors,
) {
  type ScopeFn =
    & ScopeSelfFn<Selectors>
    & ScopeBuilder<Selectors>;

  const fns = createScopeFns(selectors, FnPrefixScope, cloneScope);

  const fn = (items?: ScopeItems, debug?: DebugData) => {
    if (isDebugData(items) && debug === undefined) {
      debug = items;
      items = undefined;
    }

    const callsite = resolveCallsite(debug);

    const scope = createCallableScope(createScopeData(callsite), fns);

    if (!items) return scope;

    const data = mergeScopeData(
      scope,
      callsite,
      items,
      debug ?? null,
      null,
      null,
    );

    return data;
  };

  traceMarker(fn, 'scope');

  return fn as unknown as ScopeFn;
}

function createCallableSlot<Style>(
  data: SlotData<Style>,
  fns: Record<string, Function>,
  overrideFns: Record<string, Function>,
  transform: StyleTransform<Style> | null,
): SlotData<Style> {
  const slotId = data[BUILDER_SLOT_ID];

  const callable = ((style?: StyleObject, debug?: DebugData) => {
    if (isDebugData(style) && debug === undefined) {
      debug = style;
      style = undefined;
    }

    const callsite = resolveCallsite(debug);

    const overrideData = mergeSlotOverrideData(
      createSlotOverrideData(callsite, slotId),
      callsite,
      style ? transformStyle(style, transform) : null,
      debug ?? null,
      null,
      null,
    );

    return createDefaultFnResult(overrideData, overrideFns);
  }) as unknown as SlotData<Style>;

  traceMarker(callable, 'slot.override');
  Object.setPrototypeOf(callable, fns);
  Object.assign(callable, data);
  return callable;
}

function createCallableScope(
  data: ReturnType<typeof createScopeData>,
  fns: Record<string, Function>,
): ScopeData {
  const scope = ((slot: SlotData<any>) => {
    return createScopeTargetData(scope as ScopeData, slot);
  }) as ScopeData;

  traceMarker(scope, 'scope.target');
  Object.setPrototypeOf(scope, fns);
  Object.assign(scope, data);

  return scope;
}

function cloneScope(
  source: ScopeData,
  callsite: BuilderCallsite | null,
) {
  const scope = createCallableScope(
    createScopeData(callsite ?? source[BUILDER_CALLSITE]),
    Object.getPrototypeOf(source),
  );

  scope[BUILDER_STATE].items = source[BUILDER_STATE].items.slice();
  scope[BUILDER_STATE].lookup = Object.assign(Object.create(null), source[BUILDER_STATE].lookup);

  return scope;
}
