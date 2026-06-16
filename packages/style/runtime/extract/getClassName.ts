import {
  BUILDER_STATE,
  BUILDER_TYPE,
  BUILDER_TYPE_SLOT,
  BUILDER_TYPE_SLOT_OVERRIDE,
  BUILDER_TYPE_STYLE,
  BUILDER_TYPE_THEME,
  ITEM_VALUE_NUMBER_PX,
  ITEM_VALUE_TYPE_AT_RULE_REF,
  ITEM_VALUE_TYPE_VARIABLE,
} from '../../builder/data/const';
import type { StateItem } from '../../builder/data/state';
import { getExtractedTokenBoundData, isExtractedTokenBoundData } from '../../builder/extract/withTokens';
import { RUNTIME_CONFIG } from '../../config';
import {
  getStyleTokenId,
  isStyleTokenData,
  isStyleTokenOverrideData,
  type StyleTokenData,
  type StyleTokenOverride,
} from '../../style/token';
import {
  type ClassNameProps,
  type ClassNameResult,
  createClassNameResult,
  finishClassNameResult,
  mergeClassName,
  mergeResolvedClassName,
  mergeResolvedStyle,
  mergeStyle,
} from '../core/className';
import type { StyleProp } from '../types';

type TokenValues = Record<string, unknown> | null;

let runId = 0;

const dedupeRun: Record<string, number> = Object.create(null);
const dedupeIndex: Record<string, number> = Object.create(null);

export function getClassName(
  styleProp: StyleProp,
  props: ClassNameProps = {},
): ClassNameResult {
  const result = createClassNameResult(props);
  const resolved = resolveExtractedStyleProp(styleProp);

  if (resolved) {
    mergeResolvedClassName(result, resolved.className);
    mergeResolvedStyle(result, resolved.style);
  }

  return finishClassNameResult(result);
}

export { type ClassNameProps, type ClassNameResult, mergeClassName, mergeStyle };

function resolveExtractedStyleProp(styleProp: StyleProp | undefined) {
  if (!styleProp) return null;

  runId++;

  const classNames: string[] = [];
  let style: Record<string, unknown> | undefined;
  const stack: unknown[] = [styleProp];

  while (stack.length) {
    const item = stack.pop();
    if (!item) continue;

    if (Array.isArray(item)) {
      for (let i = item.length - 1; i >= 0; i--) stack.push(item[i]);
      continue;
    }

    if (isExtractedTokenBoundData(item)) {
      const bound = getExtractedTokenBoundData(item);
      style = appendExtractedData(
        classNames,
        style,
        bound.data,
        createTokenValues(bound.tokens),
      );
      continue;
    }

    style = appendExtractedData(classNames, style, item, null);
  }

  if (!classNames.length) return null;

  return {
    className: classNames.join(' '),
    style,
  };
}

function appendExtractedData(
  classNames: string[],
  style: Record<string, unknown> | undefined,
  data: unknown,
  tokens: TokenValues,
) {
  if (!data || (typeof data !== 'object' && typeof data !== 'function')) return style;

  const resolvedItems = (data as { items?: StateItem[]; }).items;

  if (resolvedItems) {
    for (let i = 0, len = resolvedItems.length; i < len; i++) {
      style = addStateItem(classNames, style, resolvedItems[i], tokens);
    }
    return style;
  }

  const type = (data as { [BUILDER_TYPE]?: number; })[BUILDER_TYPE];

  if (type === BUILDER_TYPE_THEME) {
    const className = (data as { className?: string; }).className;
    if (className) classNames.push(className);
    return style;
  }

  if (type !== BUILDER_TYPE_STYLE && type !== BUILDER_TYPE_SLOT) return style;

  const items = (data as { [BUILDER_STATE]?: { items?: StateItem[]; }; })[BUILDER_STATE]?.items;
  if (!items) return style;

  for (let i = 0, len = items.length; i < len; i++) {
    style = addStateItem(classNames, style, items[i], tokens);
  }

  return style;
}

function addStateItem(
  classNames: string[],
  style: Record<string, unknown> | undefined,
  item: StateItem,
  tokens: TokenValues,
) {
  const dedupe = getStateItemDedupe(item);
  const className = getStateItemClassName(item);

  if (!dedupe || !className) return style;

  if (dedupeRun[dedupe] === runId) {
    classNames[dedupeIndex[dedupe]] = className;
  } else {
    dedupeRun[dedupe] = runId;
    dedupeIndex[dedupe] = classNames.push(className) - 1;
  }

  return addStateItemStyle(style, item, tokens);
}

function addStateItemStyle(
  style: Record<string, unknown> | undefined,
  item: StateItem,
  tokens: TokenValues,
) {
  const value = getStateItemValue(item);

  if (Array.isArray(value)) {
    if (value[0] === ITEM_VALUE_TYPE_VARIABLE) {
      return setStyleValue(style, value[1], normalizeValue(resolveValue(value[2], tokens), value[3]));
    }

    if (value[0] === ITEM_VALUE_TYPE_AT_RULE_REF) {
      const refTokens = value[1]?.tokens;
      if (!tokens || !refTokens?.length) return style;

      let next = style;
      for (let i = 0, len = refTokens.length; i < len; i++) {
        const token = refTokens[i];
        const id = getStyleTokenId(token);
        if (tokens[id] !== undefined) {
          next = setStyleValue(next, getTokenVarName(token), tokens[id]);
        }
      }

      return next;
    }
  }

  return style;
}

function getStateItemDedupe(item: StateItem) {
  if (Array.isArray(item)) {
    return typeof item[0] === 'number'
      ? item[0] === BUILDER_TYPE_STYLE ? item[1] : item[2]
      : item[0];
  }

  return '';
}

function getStateItemClassName(item: StateItem) {
  if (Array.isArray(item)) {
    return typeof item[0] === 'number'
      ? item[0] === BUILDER_TYPE_STYLE ? item[2] : item[3]
      : item[1];
  }

  return '';
}

function getStateItemValue(item: StateItem) {
  if (!Array.isArray(item)) return undefined;

  if (typeof item[0] !== 'number') return item[2];
  if (item[0] === BUILDER_TYPE_STYLE) return item[3];
  if (item[0] === BUILDER_TYPE_SLOT || item[0] === BUILDER_TYPE_SLOT_OVERRIDE) return item[4];

  return undefined;
}

function resolveValue(value: unknown, tokens: TokenValues) {
  if (isStyleTokenData(value)) {
    if (tokens) {
      const id = getStyleTokenId(value);
      if (tokens[id] !== undefined) return tokens[id];
    }

    return getTokenVar(value);
  }

  return value;
}

function normalizeValue(value: unknown, valueMode: unknown) {
  if (typeof value !== 'number') return value;
  return valueMode === ITEM_VALUE_NUMBER_PX ? value + 'px' : String(value);
}

function createTokenValues(tokens: readonly StyleTokenOverride[]) {
  const values: Record<string, unknown> = Object.create(null);

  for (let i = 0, len = tokens.length; i < len; i++) {
    const token = tokens[i];
    if (!isStyleTokenOverrideData(token)) continue;

    values[getStyleTokenId(token)] = token.ref
      ? getTokenVar(token.ref)
      : token.value;
  }

  return values;
}

function getTokenVarName(token: StyleTokenData | StyleTokenOverride) {
  return '--' + RUNTIME_CONFIG.tokenVarPrefix + getStyleTokenId(token);
}

function getTokenVar(token: StyleTokenData): string {
  const varName = getTokenVarName(token);

  if (token.ref) {
    return `var(${varName}, ${getTokenVar(token.ref)})`;
  }

  return `var(${varName}, ${String(token.value ?? '')})`;
}

function setStyleValue(
  style: Record<string, unknown> | undefined,
  name: string,
  value: unknown,
) {
  const next = style ?? {};
  next[name] = value;
  return next;
}
