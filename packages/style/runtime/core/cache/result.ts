import type { CSSProperties } from 'react';
import type { StateItem } from '../../../builder/data/state';
import type { ResolvedStyleItem } from './item';
import { getStyleTokenValues, isResolvedStyleItem } from './item';
import {
  getStateItemAtRuleRefVariables,
  getStateItemClassName,
  getStateItemDedupe,
  getStateItemVariableValue,
} from './stateItem';
import type { StyleTokenValues } from './tokenValues';

export type ResolvedStyleProp = {
  className: string;
  style: CSSProperties | undefined;
};

export type StylePropResolveItem = ResolvedStyleItem | object;

export const emptyStylePropResult: ResolvedStyleProp = {
  className: '',
  style: undefined,
};

let runId = 0;

const dedupeRun: Record<string, number> = Object.create(null);
const dedupeIndex: Record<string, number> = Object.create(null);

export function createStylePropResult(
  items: readonly StylePropResolveItem[],
  getThemeClassName: (item: object) => string | null,
): ResolvedStyleProp {
  runId++;

  const classNames: string[] = [];
  let style: CSSProperties | undefined;

  for (let i = 0, len = items.length; i < len; i++) {
    const item = items[i];

    if (!isResolvedStyleItem(item)) {
      const themeClassName = getThemeClassName(item);
      if (themeClassName) classNames.push(themeClassName);
      continue;
    }

    const tokens = getStyleTokenValues(item);
    const stateItems = item.items;

    for (let j = 0, itemLen = stateItems.length; j < itemLen; j++) {
      style = addItem(classNames, style, stateItems[j], tokens);
    }
  }

  if (!classNames.length) return emptyStylePropResult;

  return {
    className: classNames.join(' '),
    style,
  };
}

function addItem(
  classNames: string[],
  style: CSSProperties | undefined,
  item: StateItem,
  tokens: StyleTokenValues | null,
) {
  const dedupe = getStateItemDedupe(item);
  const className = getStateItemClassName(item);

  if (!dedupe || !className) return style;

  if (dedupeRun[dedupe] === runId) {
    classNames[dedupeIndex[dedupe]] = className;
    return addItemStyle(style, item, tokens);
  }

  dedupeRun[dedupe] = runId;
  dedupeIndex[dedupe] = classNames.push(className) - 1;
  return addItemStyle(style, item, tokens);
}

function addItemStyle(
  style: CSSProperties | undefined,
  item: StateItem,
  tokens: StyleTokenValues | null,
) {
  const variableValue = getStateItemVariableValue(item, tokens);
  if (variableValue) {
    style = setStyleValue(style, variableValue[0], variableValue[1]);
  }

  const refValues = getStateItemAtRuleRefVariables(item, tokens);
  if (!refValues) return style;

  for (let i = 0, len = refValues.length; i < len; i++) {
    style = setStyleValue(style, refValues[i][0], refValues[i][1]);
  }

  return style;
}

function setStyleValue(
  style: CSSProperties | undefined,
  name: string,
  value: unknown,
) {
  const next = style ?? {};

  (next as Record<string, unknown>)[name] = value;

  return next;
}
