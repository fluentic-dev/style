import type { TransformElement } from '../../jsx/utils';
import { hasOwn } from '../../utils/object';
import type { RuntimeStyleAttributes, StyleProp } from '../types';
import type { ClassNameProps, ClassNameResult } from './className';
import { createElementMarkerClassName, splitElementMarkerStyleProp } from './elementMarker';

export function createTransformElement(
  getClassName: (styleProp: StyleProp, props?: ClassNameProps) => ClassNameResult,
): TransformElement {
  return ({ type, props }) => {
    if (!props || typeof type !== 'string') return { type, props };
    if (!hasOwn(props as object, 'css')) return { type, props };

    const { css, ...rest } = props as RuntimeStyleAttributes & ClassNameProps;

    if (!css) return { type, props: rest };

    const marker = splitElementMarkerStyleProp(css);

    if (marker.styleProp) {
      Object.assign(rest, getClassName(marker.styleProp, rest));
    }

    prependClassName(rest, createElementMarkerClassName(marker.debug));

    return { type, props: rest };
  };
}

function prependClassName(
  props: ClassNameProps,
  className: string | null,
) {
  if (!className) return;

  props.className = props.className
    ? `${className} ${props.className}`
    : className;
}
