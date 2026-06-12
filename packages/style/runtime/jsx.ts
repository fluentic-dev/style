import type { TransformElement } from '../jsx/utils';
import { handleCssProp, handleScopeProp } from './runtime';
import type { RuntimeStyleAttributes } from './types';

export const transformElement: TransformElement = ({ type, props }) => {
  if (!props || typeof type !== 'string') return { type, props };

  const { css, scope, ...rest } = props as RuntimeStyleAttributes;

  const result = handleCssProp(type, css, rest);

  return handleScopeProp(result.type, scope, result.props);
};
