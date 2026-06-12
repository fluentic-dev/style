import { type RefObject, useInsertionEffect, useRef } from 'react';
import { RUNTIME_CONFIG } from '../../config';
import { useCssScopeContext } from '../context';
import { useCssRuntimeContext } from '../context/RuntimeContext';
import { createCssInstanceTokenWrapper, type CssInstance, type CssTokenData, getCssInstanceScopes } from '../instance';
import { insertRuntimeRules } from '../sheet';
import type { StyleItems } from '../types';

type UseCssArg = StyleItems[number] | StyleItems;

type TokenRef<T> = {
  base: CssInstance<T>;
  tokensData: CssTokenData;
  wrapped: CssInstance<T>;
};

export function useCss<T extends object>(
  styles: T,
  ...args: UseCssArg[]
) {
  const context = useCssRuntimeContext();
  const scopeContext = useCssScopeContext();

  const tokenRef = useRef<TokenRef<T> | null>(null);

  const inherited = scopeContext?.get(styles);
  const inheritedScopes = inherited ? getCssInstanceScopes(inherited) : [];
  const items = normalizeStyleItems(args);

  const result = context.pool.get(
    styles,
    inheritedScopes,
    items,
    tokenRef.current?.tokensData ?? null,
  );

  const instance = getUseCssInstance(
    result.instance,
    result.tokensData,
    result.isTokenDataChanged,
    tokenRef,
  );

  if (!RUNTIME_CONFIG.isCssExtracted) {
    useInsertionEffect(() => {
      insertRuntimeRules(context.sheet, styles, instance);
      context.sheet.flush();
    });
  }

  return instance;
}

function getUseCssInstance<T extends object>(
  base: CssInstance<T>,
  tokensData: CssTokenData | null,
  isTokenDataChanged: boolean,
  tokenRef: RefObject<TokenRef<T> | null>,
) {
  if (!tokensData) {
    tokenRef.current = null;
    return base;
  }

  const current = tokenRef.current;

  if (!current || current.base !== base || isTokenDataChanged) {
    const wrapped = createCssInstanceTokenWrapper(base, tokensData);
    tokenRef.current = { base, tokensData, wrapped };
    return wrapped;
  }

  return current.wrapped;
}

function normalizeStyleItems(itemsOrList: UseCssArg[]): StyleItems {
  if (itemsOrList.length === 1 && Array.isArray(itemsOrList[0])) {
    return itemsOrList[0];
  }

  const result: StyleItems = [];

  for (let i = 0, len = itemsOrList.length; i < len; i++) {
    const item = itemsOrList[i];
    if (!item) continue;

    if (Array.isArray(item)) {
      for (let j = 0, itemLen = item.length; j < itemLen; j++) {
        const child = item[j];
        if (child) result.push(child);
      }
    } else {
      result.push(item);
    }
  }

  return result;
}
