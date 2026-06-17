import type { TransformElement, TransformElementArgs } from '../../jsx/utils';
import { hasOwn } from '../../utils/object';
import type { ClassNameProps } from '../core/className';
import type { StyleProp } from '../types';
import { getClassName } from './getClassName';

export const transformElement: TransformElement = ({ type, props }) => {
  return transformElementProps(type, props);
};

export function transformElementProps(
  type: TransformElementArgs['type'],
  props: unknown,
): TransformElementArgs {
  if (!props || typeof type !== 'string') return { type, props };
  if (!hasOwn(props as object, 'css')) return { type, props };

  return {
    type,
    props: transformCssProps(props as Record<PropertyKey, unknown>),
  };
}

export function transformCssProps(
  attrs: Record<PropertyKey, unknown>,
) {
  const css = attrs.css;

  if (hasOnlyCss(attrs)) {
    return css ? getClassName(css as StyleProp) : {};
  }

  const rest: Record<PropertyKey, unknown> = {};

  for (const key in attrs) {
    if (key !== 'css') rest[key] = attrs[key];
  }

  if (!css) return rest;

  const className = getClassName(css as StyleProp, rest as ClassNameProps);

  if (className.className !== undefined) rest.className = className.className;
  if (className.style !== undefined) rest.style = className.style;

  return rest;
}

function hasOnlyCss(attrs: Record<PropertyKey, unknown>) {
  for (const key in attrs) {
    if (key !== 'css') return false;
  }

  return true;
}
