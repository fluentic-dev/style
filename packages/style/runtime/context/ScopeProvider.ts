import { createContext, createElement, type ElementType, memo, type ReactNode, useContext, useMemo } from 'react';
import { type CssInstance, getCssInstanceStyles, isCssInstance } from '../instance';
import type { CssScopeProp } from '../types';

export type CssScopeContext = Map<unknown, CssInstance>;

export type ScopeProviderProps = {
  scope?: CssScopeProp;
  children?: ReactNode;
  elementType?: ElementType;
  elementProps?: Record<string, unknown>;
};

const Context = createContext<CssScopeContext | null>(null);

export function useCssScopeContext() {
  return useContext(Context);
}

export const ScopeProvider = memo((props: ScopeProviderProps) => {
  const { scope, children, elementType, elementProps } = props;

  const parent = useCssScopeContext();
  const context = useMemo(() => {
    const context: CssScopeContext = parent ? new Map(parent) : new Map();

    walkScopeProp(scope, (item) => {
      context.set(getCssInstanceStyles(item), item);
    });

    return context;
  }, [parent, scope]);

  const content = elementType
    ? createElement(elementType, elementProps)
    : children;

  return createElement(Context, { value: context }, content);
});

function walkScopeProp(
  scope: CssScopeProp | undefined,
  fn: (item: CssInstance) => void,
) {
  const stack: CssScopeProp[] = [scope];

  while (stack.length > 0) {
    const item = stack.pop();

    if (!item) continue;

    if (Array.isArray(item)) {
      for (let i = item.length - 1; i >= 0; i--) {
        stack.push(item[i]);
      }

      continue;
    }

    if (isCssInstance(item)) {
      fn(item);
    }
  }
}
