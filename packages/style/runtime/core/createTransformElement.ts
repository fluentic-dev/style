import type { TransformElement } from '../../jsx/utils';
import { hasOwn } from '../../utils/object';
import type { RuntimeStyleAttributes, StyleProp } from '../types';
import type { ClassNameProps, ClassNameResult } from './className';

export function createTransformElement(
  getClassName: (styleProp: StyleProp, props?: ClassNameProps) => ClassNameResult,
): TransformElement {
  return ({ type, props }) => {
    if (!props || typeof type !== 'string') return { type, props };
    if (!hasOwn(props as object, 'css')) return { type, props };

    const { css, ...rest } = props as RuntimeStyleAttributes;

    if (!css) return { type, props: rest };

    Object.assign(rest, getClassName(css, rest));

    return { type, props: rest };
  };
}
