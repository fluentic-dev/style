import type { TransformElement } from '../../jsx/utils';
import { getClassName } from '../style';
import type { RuntimeStyleAttributes } from '../types';

export const transformElement: TransformElement = ({ type, props }) => {
  if (!props || typeof type !== 'string') return { type, props };

  const { css, ...rest } = props as RuntimeStyleAttributes;

  const classNameProps = getClassName(css, rest);

  Object.assign(rest, classNameProps);

  return { type, props: rest };
};
