import type { ElementType } from 'react';
import { RUNTIME_CONFIG } from '../../config';
import type { TransformElement } from '../../jsx/utils';
import { getGlobalSheet } from '../sheet';
import type { CssProp, DomElementProps, RuntimeStyleAttributes } from '../types';
import { insertCssPropRuntimeRules, resolveCssProp } from './cssProp';

export const transformElement: TransformElement = ({ type, props }) => {
  if (!props || typeof type !== 'string') return { type, props };

  const { css, ...rest } = props as RuntimeStyleAttributes;

  return handleCssProp(type, css, rest);
};

function handleCssProp(
  type: ElementType,
  css: CssProp | undefined,
  rest: DomElementProps,
): { type: ElementType; props: DomElementProps; } {
  if (!css) return { type, props: rest };

  const result = resolveCssProp(css);

  if (!RUNTIME_CONFIG.isCssExtracted) {
    const sheet = getGlobalSheet();
    insertCssPropRuntimeRules(sheet, css);
    sheet.flush();
  }

  const props = { ...rest };

  if (result.className) {
    props.className = rest.className
      ? rest.className + ' ' + result.className
      : result.className;
  }

  if (result.style) {
    props.style = rest.style
      ? { ...result.style, ...rest.style }
      : result.style;
  }

  return { type, props };
}
