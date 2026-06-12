import { getAtomicClassName, getClassNameDedupe } from '../../../atomic/classname';
import { getTokenVar } from '../../../atomic/token';
import { getCssVar } from '../../../atomic/utils';
import { RUNTIME_CONFIG } from '../../../config';
import { isStyleTokenData, type StyleTokenData } from '../../../style/token';
import type { StyleObject, StyleValueTuple } from '../../../style/types';
import { traceError } from '../../../utils/trace';
import {
  BUILDER_SLOT_ID,
  BUILDER_STATE,
  BUILDER_TYPE_SLOT,
  BUILDER_TYPE_SLOT_OVERRIDE,
  BUILDER_TYPE_STYLE,
  ITEM_VALUE_TYPE_VARIABLE,
} from '../const';
import type { BuilderCallsite, BuilderData, StyleData } from '../data';
import { type DebugData, getDebugFieldCallsite, getDebugFieldVarName } from '../debug';
import { isSlotData, isSlotOverrideData, isStyleData } from '../is';
import type { BuilderType, ItemSelector, ItemValue, RuntimeItem, RuntimeItemData, StateItem } from '../state';
import { cloneData } from './utils';

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
  let value: ItemValue;
  let priority: number | null;
  let itemCallsite: BuilderCallsite | null;
  let className: string;
  let dedupe: string;
  let token: StyleTokenData | null;
  let variableName: string | null;
  let lookupIndex: number;

  if (isStyleData(style)) {
    const stylesItems = style[BUILDER_STATE].items;

    for (let i = 0, len = stylesItems.length; i < len; i++) {
      item = stylesItems[i];

      if (Array.isArray(item) || item.type !== BUILDER_TYPE_STYLE) {
        console.log(traceError('invalid style data'), 'data:', { item, style });
        continue;
      }

      if (atRule) {
        item = Object.assign({}, item, {
          atRule: item.atRule ? atRule.concat(item.atRule) : atRule,
        });
      }

      // Re-type to SLOT/SLOT_OVERRIDE when this StyleData is used inside a slot context.
      // Without this, style.slot(...).media('...', style({...})) would keep the inner
      // items as BUILDER_TYPE_STYLE and they would not be resolved when the slot is used.
      if (type === BUILDER_TYPE_SLOT && slotId !== null) {
        item = Object.assign({}, item, { type: BUILDER_TYPE_SLOT, slotId });
      } else if (type === BUILDER_TYPE_SLOT_OVERRIDE && slotId !== null) {
        item = Object.assign({}, item, { type: BUILDER_TYPE_SLOT_OVERRIDE, slotId });
      }

      items.push(item);
    }
  } else {
    for (const property in style) {
      valueRaw = style[property as keyof typeof style];
      priority = null;

      if (Array.isArray(valueRaw)) {
        priority = (valueRaw as StyleValueTuple)[0];
        valueRaw = (valueRaw as StyleValueTuple)[1];
      }

      token = isStyleTokenData(valueRaw) ? valueRaw : null;
      variableName = getDebugFieldVarName(debug, property);

      value = variableName
        ? getCssVar(variableName, String(token ? token.value : valueRaw ?? ''))
        : token
        ? getTokenVar(token, RUNTIME_CONFIG.tokenVarPrefix)
        : String(valueRaw ?? '');

      value = priority ? [value, priority] : value;
      itemCallsite = getDebugFieldCallsite(debug, property) ?? callsite;

      itemData = {
        runtime: runtimeType,
        dedupe: '',
        className: '',
        property,
        value,
        variable: variableName
          ? [ITEM_VALUE_TYPE_VARIABLE, variableName, valueRaw]
          : undefined,
        token,
        selector,
        atRule,
        callsite: itemCallsite,
      };

      if (type === BUILDER_TYPE_STYLE) {
        items.push({ ...itemData, type: BUILDER_TYPE_STYLE });
        continue;
      }

      if (slotId === null) {
        console.log(traceError('invalid style data'), 'data:', { property, style });
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

      console.log(traceError('invalid style data'), 'data:', { property, style });
    }
  }

  if (!items.length) return data;

  for (let i = 0, len = items.length; i < len; i++) {
    item = items[i];

    if (Array.isArray(item)) {
      console.log(traceError('invalid style data'), 'data:', { item, style });
      continue;
    }

    const runtimeItem = item as RuntimeItem;
    value = runtimeItem.value;
    priority = null;

    if (Array.isArray(value)) {
      priority = value[1];
      value = value[0];
    }

    dedupe = getClassNameDedupe(
      runtimeItem.property,
      priority,
      runtimeItem.selector,
      null,
      runtimeItem.atRule,
    );

    className = getAtomicClassName(
      runtimeItem.property,
      priority,
      value,
      runtimeItem.selector,
      null,
      runtimeItem.atRule,
      runtimeItem.callsite,
      RUNTIME_CONFIG.classNamePrefix,
      RUNTIME_CONFIG.localClassName,
      RUNTIME_CONFIG.debugClassName,
      RUNTIME_CONFIG.debugPropertyLength,
      RUNTIME_CONFIG.debugValueLength,
      RUNTIME_CONFIG.debugSelectorLength,
      RUNTIME_CONFIG.debugParentSelectorLength,
      RUNTIME_CONFIG.debugAtRuleLength,
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
