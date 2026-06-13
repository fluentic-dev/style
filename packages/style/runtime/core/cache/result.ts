import type { CSSProperties } from 'react';
import type { StateItem } from '../../../builder/data/state';
import type { ResolvedStyleItem } from './item';
import { getStyleTokenValues, isResolvedStyleItem } from './item';
import { getStateItemClassName, getStateItemDedupe, getStateItemVariableValue } from './stateItem';
import type { StyleTokenValues } from './tokenValues';

export type ResolvedCssProp = {
  className: string;
  style: CSSProperties | undefined;
};

export type CssPropResolveItem = ResolvedStyleItem | object;

export const emptyCssPropResult: ResolvedCssProp = {
  className: '',
  style: undefined,
};

let runId = 0;

const dedupeRun: Record<string, number> = Object.create(null);
const dedupeIndex: Record<string, number> = Object.create(null);

export function createCssPropResult(
  items: readonly CssPropResolveItem[],
  getThemeClassName: (item: object) => string | null,
): ResolvedCssProp {
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

  if (!classNames.length) return emptyCssPropResult;

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
  if (!variableValue) return style;

  const next = style ?? {};

  (next as Record<string, unknown>)[variableValue[0]] = variableValue[1];

  return next;
}
