import type { ElementType } from 'react';
import { ScopeProvider } from './context';
import { resolveCssProp } from './instance';
import type { CssProp, CssScopeProp, DomElementProps } from './types';

export function handleCssProp(
  type: ElementType,
  css: CssProp | undefined,
  rest: DomElementProps,
): { type: ElementType; props: DomElementProps; } {
  if (!css) return { type, props: rest };

  const result = resolveCssProp(css);
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

export function handleScopeProp(
  type: ElementType,
  scope: CssScopeProp | undefined,
  props: Record<string, unknown>,
): { type: ElementType; props: Record<string, unknown>; } {
  if (!scope) return { type, props };

  return {
    type: ScopeProvider,
    props: {
      scope,
      elementType: type,
      elementProps: props,
    },
  };
}
