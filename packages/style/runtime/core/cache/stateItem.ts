import { getTokenVar, getTokenVarName } from '../../../atomic/token';
import {
  BUILDER_TYPE_SCOPE,
  BUILDER_TYPE_SLOT,
  BUILDER_TYPE_SLOT_OVERRIDE,
  BUILDER_TYPE_STYLE,
  ITEM_VALUE_NUMBER_PX,
  ITEM_VALUE_TYPE_AT_RULE_REF,
  ITEM_VALUE_TYPE_VARIABLE,
} from '../../../builder/data/const';
import type { StateItem } from '../../../builder/data/state';
import { CSS_CONFIG } from '../../../config/config/css';
import { getStyleTokenId, isStyleTokenData, isStyleTokenOverrideData, type StyleTokenData } from '../../../style/token';
import type { AtRuleRefData } from '../../../style/valueRef';
import { hasOwn } from '../../../utils/object';
import type { StyleTokenValues } from './tokenValues';

export function getStateItemDedupe(item: StateItem) {
  if (Array.isArray(item)) {
    if (typeof item[0] === 'number') {
      switch (item[0]) {
        case BUILDER_TYPE_STYLE:
          return item[1];
        case BUILDER_TYPE_SLOT:
        case BUILDER_TYPE_SLOT_OVERRIDE:
        case BUILDER_TYPE_SCOPE:
          return item[2];
      }
    } else if (typeof item[1] === 'string') {
      return item[1];
    }

    return '';
  }

  if (isStyleTokenOverrideData(item)) return '';

  return item.dedupe;
}

export function getStateItemClassName(item: StateItem) {
  if (Array.isArray(item)) {
    if (typeof item[0] === 'number') {
      switch (item[0]) {
        case BUILDER_TYPE_STYLE:
          return item[2];
        case BUILDER_TYPE_SLOT:
        case BUILDER_TYPE_SLOT_OVERRIDE:
        case BUILDER_TYPE_SCOPE:
          return item[3];
      }
    } else {
      return item[1];
    }

    return '';
  }

  if (isStyleTokenOverrideData(item)) return '';

  return item.className;
}

export function getStateItemVariableValue(
  item: StateItem,
  tokens: StyleTokenValues | null,
): [string, unknown] | null {
  const value = getStateItemValue(item);

  if (Array.isArray(value) && value[0] === ITEM_VALUE_TYPE_VARIABLE) {
    return [
      value[1],
      resolveMarkedVariableValue(value[2], value[3], tokens),
    ];
  }

  if (!Array.isArray(item) && !isStyleTokenOverrideData(item) && item.variable?.[0] === ITEM_VALUE_TYPE_VARIABLE) {
    return [
      item.variable[1],
      resolveMarkedVariableValue(item.variable[2], item.variable[3], tokens),
    ];
  }

  if (!Array.isArray(item) && !isStyleTokenOverrideData(item) && item.token) {
    if (!tokens) return null;

    const id = getStyleTokenId(item.token);
    if (!hasOwn(tokens.lookup, id)) return null;

    return [
      getTokenVarName(item.token, CSS_CONFIG.tokenNameFormat ?? null),
      tokens.lookup[id],
    ];
  }

  return null;
}

function resolveMarkedVariableValue(
  value: unknown,
  valueMode: unknown,
  tokens: StyleTokenValues | null,
) {
  return normalizeVariableValue(resolveVariableValue(value, tokens), valueMode);
}

function normalizeVariableValue(
  value: unknown,
  valueMode: unknown,
) {
  if (typeof value !== 'number') return value;

  return valueMode === ITEM_VALUE_NUMBER_PX ? value + 'px' : String(value);
}

export function getStateItemAtRuleRef(item: StateItem): AtRuleRefData | null {
  const value = getStateItemValue(item);

  if (Array.isArray(value) && value[0] === ITEM_VALUE_TYPE_AT_RULE_REF) {
    return value[1];
  }

  if (
    !Array.isArray(item) && !isStyleTokenOverrideData(item) &&
    item.variable?.[0] === ITEM_VALUE_TYPE_AT_RULE_REF
  ) {
    return item.variable[1];
  }

  return null;
}

export function getStateItemAtRuleRefVariables(
  item: StateItem,
  tokens: StyleTokenValues | null,
): [string, unknown][] | null {
  if (!tokens) return null;

  const ref = getStateItemAtRuleRef(item);
  const refTokens = ref?.tokens;

  if (!refTokens?.length) return null;

  const values: [string, unknown][] = [];

  for (let i = 0, len = refTokens.length; i < len; i++) {
    const token = refTokens[i];
    const id = getStyleTokenId(token);

    if (!hasOwn(tokens.lookup, id)) continue;

    values.push([
      getTokenVarName(token, CSS_CONFIG.tokenNameFormat ?? null),
      tokens.lookup[id],
    ]);
  }

  return values.length ? values : null;
}

function getStateItemValue(item: StateItem) {
  if (Array.isArray(item)) {
    if (typeof item[0] === 'number') {
      switch (item[0]) {
        case BUILDER_TYPE_STYLE:
          return item[3];
        case BUILDER_TYPE_SLOT:
        case BUILDER_TYPE_SLOT_OVERRIDE:
          return item[4];
        case BUILDER_TYPE_SCOPE:
          return item[4] === true ? undefined : item[4];
      }
    } else {
      return item[2];
    }
  }

  return undefined;
}

function resolveVariableValue(
  value: unknown,
  tokens: StyleTokenValues | null,
) {
  if (isStyleTokenData(value)) {
    return resolveTokenValue(value, tokens);
  }

  return value;
}

function resolveTokenValue<T>(
  token: StyleTokenData<T>,
  tokens: StyleTokenValues | null,
): T {
  if (tokens) {
    const id = getStyleTokenId(token);
    if (hasOwn(tokens.lookup, id)) {
      return tokens.lookup[id] as T;
    }
  }

  return getTokenVar(token, CSS_CONFIG.tokenNameFormat ?? null) as T;
}
