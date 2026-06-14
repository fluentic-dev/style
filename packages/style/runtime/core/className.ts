import type { CSSProperties } from 'react';
import type { RecursiveArray } from '../../utils/type';

type Items<T = string> = T | false | null | undefined | RecursiveArray<T | false | null | undefined>;

export type ClassNameProps = {
  className?: Items<string>;
  style?: Items<CSSProperties>;
};

export type ClassNameResult = {
  className?: string | undefined;
  style?: CSSProperties | undefined;
};

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

export function mergeResolvedClassName(
  result: ClassNameResult,
  resolvedClassName: string,
) {
  if (!resolvedClassName) return;

  result.className = result.className
    ? result.className + ' ' + resolvedClassName
    : resolvedClassName;
}

export function mergeResolvedStyle(
  result: ClassNameResult,
  resolvedStyle: CSSProperties | undefined,
) {
  if (!resolvedStyle) return;

  result.style = result.style
    ? Object.assign({}, resolvedStyle, result.style)
    : resolvedStyle;
}

export function createClassNameResult(
  props: ClassNameProps = {},
): ClassNameResult {
  return {
    className: props.className ? mergeClassName(props.className) : undefined,
    style: props.style ? mergeStyle(props.style) : undefined,
  };
}

export function finishClassNameResult(result: ClassNameResult): ClassNameResult {
  return result.className || result.style ? result : {};
}
