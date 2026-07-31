import { getAtomicClassName, getClassNameDedupe } from '../../../atomic/className';
import { getTokenVar } from '../../../atomic/token';
import { getCssVarRawFallback } from '../../../atomic/utils/cssVar';
import { shouldAppendCssPx } from '../../../atomic/value';
import { CSS_CONFIG } from '../../../config/config/css';
import { DEBUG_CONFIG } from '../../../config/config/debug';
import { DEV_CONFIG } from '../../../config/config/dev';
import { isStyleImportantValue } from '../../../style/important';
import { isStyleTokenData, isStyleTokenOverrideData, type StyleTokenData } from '../../../style/token';
import { isClassNameValue } from '../../../style/transform';
import type { StyleObject } from '../../../style/types';
import { type AtRuleRef, isAtRuleRef } from '../../../style/valueRef';
import { isStyleWeightValue } from '../../../style/weight';
import {
  BUILDER_SLOT_ID,
  BUILDER_STATE,
  BUILDER_TYPE_SELECTOR_OVERRIDE,
  BUILDER_TYPE_SLOT,
  BUILDER_TYPE_SLOT_OVERRIDE,
  BUILDER_TYPE_STYLE,
  ITEM_VALUE_NUMBER_PX,
  ITEM_VALUE_TYPE_AT_RULE_REF,
  ITEM_VALUE_TYPE_VARIABLE,
} from '../const';
import type { BuilderCallsite, BuilderData, StyleData } from '../data';
import {
  type DebugData,
  type DebugLoc,
  getDebugFieldCallsite,
  getDebugFieldVarName,
  TRACE_STYLE,
  TRACE_VALUE,
} from '../debug';
import { isSlotData, isSlotOverrideData, isStyleData } from '../is';
import type { BuilderType, ItemSelector, RuntimeItem, RuntimeItemData, StateItem } from '../state';
import { cloneData, logInvalidData } from './utils';

export type CreateData<Data extends BuilderData> = (
  callsite: BuilderCallsite | null,
  data: Data,
) => Data;

export function mergeBuilderData<Data extends BuilderData>(
  create: CreateData<Data>,
  callsite: BuilderCallsite | null,
  source: Data,
  style: StyleObject | StyleData | null,
  debug: DebugData | null,
  selector: ItemSelector | null,
  atRule: ItemSelector[] | null,
  type: BuilderType,
): Data {
  if (!style) return source;

  const [runtimeType, data, styles, lookup] = cloneData(
    create(callsite, source),
    source,
    debug,
  );

  const slotId = isSlotData(source) || isSlotOverrideData(source)
    ? source[BUILDER_SLOT_ID]
    : null;

  const items: RuntimeItem[] = [];

  let item: StateItem;
  let itemData: RuntimeItemData;

  let valueRaw: unknown;
  let value: string;
  let weight: number | null;
  let important: boolean;
  let itemCallsite: BuilderCallsite | null;
  let className: string;
  let dedupe: string;
  let token: StyleTokenData | null;
  let ref: AtRuleRef | null;
  let variableName: string | null;
  let transformClassName: string | null;
  let lookupIndex: number;

  if (isStyleData(style)) {
    const stylesItems = style[BUILDER_STATE].items;

    for (let i = 0, len = stylesItems.length; i < len; i++) {
      item = stylesItems[i];

      if (Array.isArray(item) || isStyleTokenOverrideData(item) || item.type !== BUILDER_TYPE_STYLE) {
        logInvalidData('invalid style data', { item, style });
        continue;
      }

      if (atRule) {
        item = Object.assign({}, item, {
          atRule: item.atRule ? atRule.concat(item.atRule) : atRule,
        });
      }

      if (selector) {
        item = Object.assign({}, item, {
          selector: item.selector ? combineSelectors(selector, item.selector) : selector,
        });
      }

      // Re-type to SLOT/SLOT_OVERRIDE when this StyleData is used inside a slot context.
      // Without this, style.slot(...).media('...', style({...})) would keep the inner
      // items as BUILDER_TYPE_STYLE and they would not be resolved when the slot is used.
      if (type === BUILDER_TYPE_SLOT && slotId !== null) {
        item = Object.assign({}, item, { type: BUILDER_TYPE_SLOT, slotId });
      } else if (type === BUILDER_TYPE_SLOT_OVERRIDE && slotId !== null) {
        item = Object.assign({}, item, { type: BUILDER_TYPE_SLOT_OVERRIDE, slotId });
      } else if (type === BUILDER_TYPE_SELECTOR_OVERRIDE) {
        item = Object.assign({}, item, { type: BUILDER_TYPE_STYLE });
      }

      const itemDebug = getMergedStyleDebug(debug, item);
      const debugCallsite = getDebugFieldCallsite(itemDebug, item.property);
      if (debugCallsite) {
        item = Object.assign({}, item, {
          callsite: debugCallsite,
          debug: itemDebug,
          debugField: item.property,
        });
      }

      items.push(item);
    }
  } else {
    for (const property in style) {
      valueRaw = style[property as keyof typeof style];
      [valueRaw, weight, important] = unwrapAuthoredStyleValue(valueRaw);

      transformClassName = null;
      if (isClassNameValue(valueRaw)) {
        transformClassName = valueRaw.className;
        valueRaw = valueRaw.value;
      }

      ref = isAtRuleRef(valueRaw) ? valueRaw : null;
      if (ref) valueRaw = ref.value;

      token = isStyleTokenData(valueRaw) ? valueRaw : null;
      variableName = getDebugFieldVarName(debug, property);

      value = variableName && token
        ? getCssVarRawFallback(variableName, getTokenVar(token, CSS_CONFIG.tokenNameFormat ?? null))
        : token
        ? getTokenVar(token, CSS_CONFIG.tokenNameFormat ?? null)
        : String(valueRaw ?? '');

      itemCallsite = getDebugFieldCallsite(debug, property) ?? callsite;

      itemData = {
        runtime: runtimeType,
        debug,
        debugField: property,
        dedupe: '',
        className: '',
        property,
        weight,
        important,
        value,
        transformClassName,
        variable: ref
          ? [ITEM_VALUE_TYPE_AT_RULE_REF, ref]
          : variableName && token
          ? [
            ITEM_VALUE_TYPE_VARIABLE,
            variableName,
            valueRaw,
            shouldAppendCssPx(property) ? ITEM_VALUE_NUMBER_PX : undefined,
          ]
          : ref
          ? [ITEM_VALUE_TYPE_AT_RULE_REF, ref]
          : undefined,
        token,
        selector,
        atRule,
        callsite: itemCallsite,
      };

      if (type === BUILDER_TYPE_STYLE || type === BUILDER_TYPE_SELECTOR_OVERRIDE) {
        items.push({ ...itemData, type: BUILDER_TYPE_STYLE });
        continue;
      }

      if (slotId === null) {
        logInvalidData('invalid style data', { property, style });
        continue;
      }

      if (type === BUILDER_TYPE_SLOT) {
        items.push({ ...itemData, type: BUILDER_TYPE_SLOT, slotId });
        continue;
      }

      if (type === BUILDER_TYPE_SLOT_OVERRIDE) {
        items.push({ ...itemData, type: BUILDER_TYPE_SLOT_OVERRIDE, slotId });
        continue;
      }

      logInvalidData('invalid style data', { property, style });
    }
  }

  if (!items.length) return data;

  for (let i = 0, len = items.length; i < len; i++) {
    item = items[i];

    if (Array.isArray(item) || isStyleTokenOverrideData(item)) {
      logInvalidData('invalid style data', { item, style });
      continue;
    }

    const runtimeItem = item as RuntimeItem;
    value = runtimeItem.value;
    weight = runtimeItem.weight;
    important = runtimeItem.important;

    dedupe = getClassNameDedupe(
      runtimeItem.property,
      weight,
      important,
      runtimeItem.selector,
      null,
      runtimeItem.atRule,
    );

    className = getAtomicClassName(
      runtimeItem.property,
      weight,
      important,
      value,
      runtimeItem.selector,
      null,
      runtimeItem.atRule,
      runtimeItem.callsite,
      DEV_CONFIG.isLocalClassNameEnabled,
      DEBUG_CONFIG.isDebugClassNameEnabled,
      CSS_CONFIG.classNameFormat ?? null,
      runtimeItem.transformClassName ?? null,
      CSS_CONFIG.transformClassNameFormat ?? null,
      CSS_CONFIG.sheetClassNameFormat ?? null,
    );

    runtimeItem.dedupe = dedupe;
    runtimeItem.className = className;

    lookupIndex = lookup[dedupe];

    if (typeof lookupIndex === 'number') {
      styles[lookupIndex] = runtimeItem;
    } else {
      lookup[dedupe] = styles.push(runtimeItem) - 1;
    }
  }

  return data;
}

function unwrapAuthoredStyleValue(value: unknown): [value: unknown, weight: number | null, important: boolean] {
  let weight: number | null = null;
  let important = false;

  while (true) {
    if (isStyleImportantValue(value)) {
      important = true;
      value = value.value;
      continue;
    }

    if (isStyleWeightValue(value)) {
      weight = value.weight;
      value = value.value;
      continue;
    }

    break;
  }

  return [value, weight, important];
}

function combineSelectors(
  parent: ItemSelector,
  child: ItemSelector,
): ItemSelector {
  const parentText = getSelectorText(parent);
  const childText = getSelectorText(child);
  const priority = Math.max(getSelectorPriority(parent), getSelectorPriority(child));
  const selector = parentText + childText;

  return priority > 0 ? [selector, priority] : selector;
}

function getSelectorText(selector: ItemSelector) {
  return Array.isArray(selector) ? selector[0] : selector;
}

function getSelectorPriority(selector: ItemSelector) {
  return Array.isArray(selector) ? selector[1] : 0;
}

function getMergedStyleDebug(
  debug: DebugData | null,
  item: RuntimeItem,
) {
  if (!debug) return null;
  if (debug.fields?.[item.property]) return debug;

  const valueLoc = getMergedItemValueLoc(item);
  if (!valueLoc) return debug;

  return {
    ...debug,
    fields: {
      ...debug.fields,
      [item.property]: {
        [TRACE_STYLE]: withDebugSource(debug.loc, debug),
        [TRACE_VALUE]: valueLoc,
      },
    },
  };
}

function getMergedItemValueLoc(item: RuntimeItem): DebugLoc | null {
  if (item.debug && item.debugField) {
    const loc = item.debug.fields?.[item.debugField];
    if (Array.isArray(loc)) return withDebugSource(loc, item.debug);
    if (loc) {
      const traceLoc = loc[TRACE_VALUE] ?? loc[TRACE_STYLE] ?? null;
      return traceLoc ? withDebugSource(traceLoc, item.debug) : null;
    }
  }

  return item.callsite
    ? [item.callsite.line, item.callsite.column, undefined, item.callsite.sourceUrl, item.callsite.sourceContent]
    : null;
}

function withDebugSource(loc: DebugLoc, debug: DebugData): DebugLoc {
  return loc[3] ? loc : [loc[0], loc[1], loc[2], debug.sourceUrl, debug.code];
}
