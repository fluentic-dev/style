import type { TransformElement } from '../../jsx/utils';
import { hasOwn } from '../../utils/object';
import type { RuntimeStyleAttributes } from '../types';
import { getClassName } from './getClassName';

export const transformElement: TransformElement = ({ type, props }) => {
  if (!props || typeof type !== 'string') return { type, props };
  if (!hasOwn(props as object, 'css')) return { type, props };

  const { css, ...rest } = props as RuntimeStyleAttributes;

  if (!css) return { type, props: rest };

  Object.assign(rest, getClassName(css, rest));

  return { type, props: rest };
};
