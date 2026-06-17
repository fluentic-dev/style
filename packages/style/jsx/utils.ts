import type { createElement, ElementType, Fragment } from 'react';
import type { jsxDEV } from 'react/jsx-dev-runtime';
import type { jsx, jsxs } from 'react/jsx-runtime';

export type FnJsxDEV = typeof jsxDEV;
export type FnJsx = typeof jsx;
export type FnJsxs = typeof jsxs;
export type FnCreateElement = typeof createElement;

export type TransformElementArgs = {
  type: ElementType;
  props: unknown;
  source?: unknown;
};

export type TransformElement = {
  (args: TransformElementArgs): TransformElementArgs;
};

export function wrapCreateElement(
  createElement: FnCreateElement,
  transformElement: TransformElement,
): FnCreateElement {
  const fn = (type: ElementType, props: unknown, ...children: []) => {
    const result = transformElement({ type, props });

    return createElement(result.type, result.props, ...children);
  };

  return fn as FnCreateElement;
}

export function wrapFragment(
  fragment: typeof Fragment,
) {
  return fragment;
}

export function createJsxDEV(
  fn: FnJsxDEV,
  transformElement: TransformElement,
): FnJsxDEV {
  return (type, props, key, isStatic, source, self) => {
    const result = transformElement({ type, props, source });

    return fn(result.type, result.props, key, isStatic, source, self);
  };
}

export function createJsx(
  fn: FnJsx,
  transformElement: TransformElement,
): FnJsx {
  return (type, props, key) => {
    const result = transformElement({ type, props });

    return fn(result.type, result.props, key);
  };
}
