import { getAtomicClassName, getClassNameDedupe } from '../../../atomic/className';
import { CSS_CONFIG } from '../../../config/config/css';
import { DEBUG_CONFIG } from '../../../config/config/debug';
import { DEV_CONFIG } from '../../../config/config/dev';
import { getStyleTokenId, isStyleTokenOverrideData, type StyleTokenOverride } from '../../../style/token';
import { BUILDER_SLOT_ID, BUILDER_STATE, BUILDER_TYPE_SCOPE, BUILDER_TYPE_SLOT_OVERRIDE } from '../const';
import type { BuilderCallsite, ScopeData, SlotOverrideData } from '../data';
import {
  getDebugFieldCallsite,
  TRACE_STYLE,
  TRACE_VALUE,
  type DebugData,
  type DebugLoc,
} from '../debug';
import { isScopeData, isSlotOverrideData } from '../is';
import type { ItemSelector, ItemValue, RuntimeScopeItem, RuntimeSlotOverrideItem, StateItem } from '../state';
import { cloneData, logInvalidData } from './utils';

export type ScopeItem<Style = unknown> =
  | SlotOverrideData<Style>
  | ScopeData<Style>
  | StyleTokenOverride
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
  let itemDebug: DebugData | null | undefined;
  let itemCallsite: BuilderCallsite | null;

  for (let i = 0, len = sourceItems.length; i < len; i++) {
    source = sourceItems[i];
    if (!source) continue;

    if (isStyleTokenOverrideData(source)) {
      addTokenOverride(source, styles, lookup);
      continue;
    }

    if (isScopeData(source)) {
      const scopeItems = source[BUILDER_STATE].items;

      for (let j = 0, len = scopeItems.length; j < len; j++) {
        item = scopeItems[j];

        if (isStyleTokenOverrideData(item)) {
          addTokenOverride(item, styles, lookup);
          continue;
        }

        if (Array.isArray(item) || item.type !== BUILDER_TYPE_SCOPE) {
          logInvalidData('invalid scope data', { source, item });
          continue;
        }

        const sourceScopeItem = item as RuntimeScopeItem;

        atRule = scopeAtRule
          ? (sourceScopeItem.atRule ? [scopeAtRule].concat(sourceScopeItem.atRule) : [scopeAtRule])
          : sourceScopeItem.atRule;

        const scopeItem: RuntimeScopeItem = {
          ...sourceScopeItem,
          runtime: runtimeType,
          atRule,
          parentSelector: parentSelector ?? sourceScopeItem.parentSelector,
        };
        itemDebug = getMergedScopeDebug(debug, scopeItem);
        itemCallsite = getDebugFieldCallsite(itemDebug ?? null, scopeItem.property) ??
          callsite ??
          scopeItem.callsite;

        value = scopeItem.value;
        priority = null;

        if (Array.isArray(value)) {
          priority = value[1];
          value = value[0];
        }

        dedupe = getClassNameDedupe(
          scopeItem.property,
          priority,
          scopeItem.selector,
          scopeItem.parentSelector,
          scopeItem.atRule,
        );

        className = getAtomicClassName(
          scopeItem.property,
          priority,
          value,
          scopeItem.selector,
          scopeItem.parentSelector,
          scopeItem.atRule,
          itemCallsite,
          DEV_CONFIG.isLocalClassNameEnabled,
          DEBUG_CONFIG.isDebugClassNameEnabled,
          CSS_CONFIG.classNameFormat ?? null,
        );

        scopeItem.dedupe = dedupe;
        scopeItem.className = className;
        scopeItem.callsite = itemCallsite;
        scopeItem.debug = itemDebug ?? null;
        scopeItem.debugField = itemDebug ? scopeItem.property : null;

        const lookupKey = getScopeLookupKey(scopeItem.slotId, dedupe);
        lookupIndex = lookup[lookupKey];

        if (typeof lookupIndex === 'number') {
          styles[lookupIndex] = scopeItem;
        } else {
          lookup[lookupKey] = styles.push(scopeItem) - 1;
        }
      }

      continue;
    }

    if (!isSlotOverrideData(source)) {
      logInvalidData('invalid scope data', { source });
      continue;
    }

    const slotId = source[BUILDER_SLOT_ID];
    const overrideItems = source[BUILDER_STATE].items;

    for (let j = 0, len = overrideItems.length; j < len; j++) {
      item = overrideItems[j];

      if (Array.isArray(item) || isStyleTokenOverrideData(item) || item.type !== BUILDER_TYPE_SLOT_OVERRIDE) {
        logInvalidData('invalid scope data', { source, item });
        continue;
      }

      const overrideItem = item as RuntimeSlotOverrideItem;

      atRule = scopeAtRule
        ? (overrideItem.atRule ? [scopeAtRule].concat(overrideItem.atRule) : [scopeAtRule])
        : overrideItem.atRule;

      const scopeItem: RuntimeScopeItem = {
        type: BUILDER_TYPE_SCOPE,
        slotId,
        runtime: runtimeType,
        dedupe: '',
        className: '',
        property: overrideItem.property,
        value: overrideItem.value,
        token: overrideItem.token,
        selector: overrideItem.selector,
        atRule,
        callsite: overrideItem.callsite ?? callsite,
        debug: overrideItem.debug,
        debugField: overrideItem.debugField,
        parentSelector,
      };

      value = scopeItem.value;
      priority = null;

      if (Array.isArray(value)) {
        priority = value[1];
        value = value[0];
      }

      dedupe = getClassNameDedupe(
        scopeItem.property,
        priority,
        scopeItem.selector,
        parentSelector,
        scopeItem.atRule,
      );

      className = getAtomicClassName(
        scopeItem.property,
        priority,
        value,
        scopeItem.selector,
        parentSelector,
        scopeItem.atRule,
        scopeItem.callsite,
        DEV_CONFIG.isLocalClassNameEnabled,
        DEBUG_CONFIG.isDebugClassNameEnabled,
        CSS_CONFIG.classNameFormat ?? null,
      );

      scopeItem.dedupe = dedupe;
      scopeItem.className = className;

      const lookupKey = getScopeLookupKey(slotId, dedupe);
      lookupIndex = lookup[lookupKey];

      if (typeof lookupIndex === 'number') {
        styles[lookupIndex] = scopeItem;
      } else {
        lookup[lookupKey] = styles.push(scopeItem) - 1;
      }
    }
  }

  return data as ScopeData<Style>;
}

function addTokenOverride(
  item: StyleTokenOverride,
  styles: StateItem[],
  lookup: Record<string, number>,
) {
  const lookupKey = getTokenLookupKey(getStyleTokenId(item));
  const lookupIndex = lookup[lookupKey];

  if (typeof lookupIndex === 'number') {
    styles[lookupIndex] = item;
  } else {
    lookup[lookupKey] = styles.push(item) - 1;
  }
}

function getMergedScopeDebug(
  debug: DebugData | null,
  item: RuntimeScopeItem,
): DebugData | null | undefined {
  if (!debug) return item.debug;
  if (debug.fields?.[item.property]) return debug;

  const valueLoc = getRuntimeScopeItemValueLoc(item);
  if (!valueLoc) return debug;

  return {
    ...debug,
    fields: {
      ...debug.fields,
      [item.property]: {
        [TRACE_STYLE]: debug.loc,
        [TRACE_VALUE]: valueLoc,
      },
    },
  };
}

function getRuntimeScopeItemValueLoc(item: RuntimeScopeItem): DebugLoc | null {
  if (item.debug && item.debugField) {
    const loc = item.debug.fields?.[item.debugField];
    if (Array.isArray(loc)) return withDebugSource(loc, item.debug.sourceUrl, item.debug.code);
    if (loc) {
      const valueLoc = loc[TRACE_VALUE] ?? loc[TRACE_STYLE] ?? null;
      return valueLoc ? withDebugSource(valueLoc, item.debug.sourceUrl, item.debug.code) : null;
    }
  }

  return item.callsite
    ? [item.callsite.line, item.callsite.column, undefined, item.callsite.sourceUrl, item.callsite.sourceContent]
    : null;
}

function withDebugSource(
  loc: DebugLoc,
  sourceUrl: string,
  sourceContent: string | undefined,
): DebugLoc {
  return loc[3] ? loc : [loc[0], loc[1], loc[2], sourceUrl, sourceContent];
}

function getScopeLookupKey(slotId: string, dedupe: string) {
  return slotId + '\0' + dedupe;
}

function getTokenLookupKey(tokenId: string) {
  return 'token\0' + tokenId;
}
