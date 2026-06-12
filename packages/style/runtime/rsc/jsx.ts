import type { TransformElement } from '../../jsx/utils';
import { getClassName } from '../static';
import type { RuntimeStyleAttributes } from '../types';

export const transformElement: TransformElement = ({ type, props }) => {
  if (!props || typeof type !== 'string') return { type, props };

  const { css, scope, ...rest } = props as RuntimeStyleAttributes;

  if (scope) {
    throw new Error('"scope" prop is not supported on server side');
  }

  const classNameProps = getClassName(css, rest);

  Object.assign(rest, classNameProps);

  return { type, props: rest };
};
