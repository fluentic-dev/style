import type { CSSProperties } from 'react';
import { RUNTIME_CONFIG } from '../../config';
import type { RecursiveArray } from '../../utils/type';
import { getGlobalSheet } from '../sheet';
import { getClassNameRSC } from '../rsc/getClassName';
import type { CssProp, Falsy } from '../types';
import { insertCssPropRuntimeItems } from '../sheet/insert';
import { resolveCssPropRuntime } from './cache/prop';

type Items<T = string> = T | Falsy | RecursiveArray<T | Falsy>;

export type ClassNameProps = {
  className?: Items<string>;
  style?: Items<CSSProperties>;
};

export type ClassNameResult = {
  className?: string | undefined;
  style?: CSSProperties | undefined;
};

export function getClassName(
  css: CssProp,
  props: ClassNameProps = {},
): ClassNameResult {
  const propClassName = props.className;
  const propStyle = props.style;

  let className = propClassName ? mergeClassName(propClassName) : undefined;
  let style = propStyle ? mergeStyle(propStyle) : undefined;

  const resolved = resolveCssPropRuntime(css);

  if (resolved) {
    if (!RUNTIME_CONFIG.isCssExtracted && !RUNTIME_CONFIG.isRSC) {
      const sheet = getGlobalSheet();
      insertCssPropRuntimeItems(sheet, resolved.items);
      sheet.flush();
    }

    const resolvedClassName = resolved.result.className;
    const resolvedStyle = resolved.result.style;

    if (resolvedClassName) {
      className = className ? className + ' ' + resolvedClassName : resolvedClassName;
    }

    if (resolvedStyle) {
      style = style ? Object.assign({}, resolvedStyle, style) : resolvedStyle;
    }
  }

  if (!className && !style) return {};

  const result: ClassNameResult = {
    className,
    style,
  };

  if (RUNTIME_CONFIG.isDev && RUNTIME_CONFIG.isRSC) {
    return getClassNameRSC(result, resolved?.items ?? []);
  }

  return result;
}

export function mergeClassName(className: Items<string>) {
  if (!className) return undefined;
  if (!Array.isArray(className)) return className as string;

  let nextClassName = '';

  const stack: unknown[] = [className];

  while (stack.length) {
    const item = stack.pop();

    if (!item) continue;

    if (Array.isArray(item)) {
      for (let index = item.length - 1; index >= 0; index--) {
        stack.push(item[index]);
      }
    } else {
      nextClassName = nextClassName
        ? `${nextClassName} ${item}`
        : item as string;
    }
  }

  return nextClassName || undefined;
}

export function mergeStyle(style: Items<CSSProperties>) {
  if (!style) return undefined;
  if (!Array.isArray(style)) return style as CSSProperties;

  const nextStyle = {};

  const stack: unknown[] = [style];

  while (stack.length) {
    const item = stack.pop();

    if (!item) continue;

    if (Array.isArray(item)) {
      for (let index = item.length - 1; index >= 0; index--) {
        stack.push(item[index]);
      }
    } else {
      Object.assign(nextStyle, item);
    }
  }

  return nextStyle;
}
