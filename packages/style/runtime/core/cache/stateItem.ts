import { getTokenVar, getTokenVarName } from '../../../atomic/token';
import {
  BUILDER_TYPE_SCOPE,
  BUILDER_TYPE_SLOT,
  BUILDER_TYPE_SLOT_OVERRIDE,
  BUILDER_TYPE_STYLE,
  ITEM_VALUE_TYPE_VARIABLE,
} from '../../../builder/data';
import type { StateItem } from '../../../builder/data/state';
import { RUNTIME_CONFIG } from '../../../config';
import { getStyleTokenId, isStyleTokenData, isStyleTokenOverrideData, type StyleTokenData } from '../../../style/token';
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
    return [value[1], resolveVariableValue(value[2], tokens)];
  }

  if (!Array.isArray(item) && !isStyleTokenOverrideData(item) && item.variable?.[0] === ITEM_VALUE_TYPE_VARIABLE) {
    return [item.variable[1], resolveVariableValue(item.variable[2], tokens)];
  }

  if (!Array.isArray(item) && !isStyleTokenOverrideData(item) && item.token) {
    if (!tokens) return null;

    const id = getStyleTokenId(item.token);
    if (!Object.prototype.hasOwnProperty.call(tokens.lookup, id)) return null;

    return [
      getTokenVarName(item.token, RUNTIME_CONFIG.tokenVarPrefix),
      tokens.lookup[id],
    ];
  }

  return null;
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
      }
    } else {
      return item[2];
    }

    return undefined;
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
    if (Object.prototype.hasOwnProperty.call(tokens.lookup, id)) {
      return tokens.lookup[id] as T;
    }
  }

  return getTokenVar(token, RUNTIME_CONFIG.tokenVarPrefix) as T;
}
