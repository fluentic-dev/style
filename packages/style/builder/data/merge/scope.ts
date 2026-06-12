import { getAtomicClassName, getClassNameDedupe } from '../../../atomic/classname';
import { RUNTIME_CONFIG } from '../../../config';
import { isStyleTokenData, type StyleTokenData } from '../../../style/token';
import { traceError } from '../../../utils/trace';
import { BUILDER_SLOT_ID, BUILDER_STATE, BUILDER_TYPE_SCOPE, BUILDER_TYPE_SLOT_OVERRIDE } from '../const';
import type { BuilderCallsite, ScopeData, SlotOverrideData } from '../data';
import type { DebugData } from '../debug';
import { isSlotOverrideData } from '../is';
import type { ItemSelector, ItemValue, StateItem } from '../state';
import { cloneData } from './utils';

export type ScopeItem<Style = unknown> =
  | SlotOverrideData<Style>
  | StyleTokenData
  | false
  | null
  | undefined;

export type ScopeItems<Style = unknown> =
  | ScopeItem<Style>
  | ScopeItem<Style>[];

export function mergeScopeData<Style>(
  scope: ScopeData<Style>,
  callsite: BuilderCallsite | null,
  items: ScopeItems<Style> | null,
  debug: DebugData | null,
  parentSelector: ItemSelector | null,
  scopeAtRule: ItemSelector | null,
): ScopeData<Style> {
  if (!items) return scope;

  const sourceItems = Array.isArray(items) ? items : [items];
  const [runtimeType, data, styles, lookup] = cloneData(
    scope,
    scope,
    debug,
  );

  let source: ScopeItem<Style>;
  let item: StateItem;
  let lookupIndex: number;
  let priority: number | null;
  let value: ItemValue;
  let atRule: ItemSelector[] | null;
  let dedupe: string;
  let className: string;

  for (let i = 0, len = sourceItems.length; i < len; i++) {
    source = sourceItems[i];
    if (!source) continue;

    if (isStyleTokenData(source)) {
      // Token provider data is intentionally accepted by scope. Runtime token
      // resolution is still prototype-level; keep the token object in cache for
      // the resolver path instead of trying to turn it into CSS here.
      continue;
    }

    if (!isSlotOverrideData(source)) {
      console.log(traceError('invalid scope data'), 'data:', { source });
      continue;
    }

    const slotId = source[BUILDER_SLOT_ID];
    const overrideItems = source[BUILDER_STATE].items;

    for (let j = 0, len = overrideItems.length; j < len; j++) {
      item = overrideItems[j];

      if (Array.isArray(item) || item.type !== BUILDER_TYPE_SLOT_OVERRIDE) {
        console.log(traceError('invalid scope data'), 'data:', { source, item });
        continue;
      }

      atRule = scopeAtRule ? (item.atRule ? [scopeAtRule].concat(item.atRule) : [scopeAtRule]) : item.atRule;

      item = {
        type: BUILDER_TYPE_SCOPE,
        slotId,
        runtime: runtimeType,
        dedupe: '',
        className: '',
        property: item.property,
        value: item.value,
        token: item.token,
        selector: item.selector,
        atRule,
        callsite: item.callsite ?? callsite,
        parentSelector,
      };

      value = item.value;
      priority = null;

      if (Array.isArray(value)) {
        priority = value[1];
        value = value[0];
      }

      dedupe = getClassNameDedupe(
        item.property,
        priority,
        item.selector,
        parentSelector,
        item.atRule,
      );

      className = getAtomicClassName(
        item.property,
        priority,
        value,
        item.selector,
        parentSelector,
        item.atRule,
        item.callsite,
        RUNTIME_CONFIG.classNamePrefix,
        RUNTIME_CONFIG.localClassName,
        RUNTIME_CONFIG.debugClassName,
        RUNTIME_CONFIG.debugPropertyLength,
        RUNTIME_CONFIG.debugValueLength,
        RUNTIME_CONFIG.debugSelectorLength,
        RUNTIME_CONFIG.debugParentSelectorLength,
        RUNTIME_CONFIG.debugAtRuleLength,
      );

      item.dedupe = dedupe;
      item.className = className;

      const lookupKey = getScopeLookupKey(slotId, dedupe);
      lookupIndex = lookup[lookupKey];

      if (typeof lookupIndex === 'number') {
        styles[lookupIndex] = item;
      } else {
        lookup[lookupKey] = styles.push(item) - 1;
      }
    }
  }

  return data as ScopeData<Style>;
}

function getScopeLookupKey(slotId: string, dedupe: string) {
  return slotId + '\0' + dedupe;
}
