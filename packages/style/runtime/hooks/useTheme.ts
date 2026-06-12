import { useInsertionEffect, useRef } from 'react';
import type { ThemeData } from '../../builder/data';
import { RUNTIME_CONFIG } from '../../config';
import { useCssRuntimeContext } from '../context/RuntimeContext';
import { createCssTheme, type CssResolvedTheme } from '../instance';
import { insertRuntimeTheme } from '../sheet';

export function useTheme(theme: ThemeData): CssResolvedTheme {
  const context = useCssRuntimeContext();
  const currentRef = useRef<
    {
      theme: ThemeData;
      resolved: CssResolvedTheme;
    } | null
  >(null);

  let current = currentRef.current;

  if (!current || current.theme !== theme) {
    current = {
      theme,
      resolved: createCssTheme(theme),
    };
    currentRef.current = current;
  }

  if (!RUNTIME_CONFIG.isCssExtracted) {
    useInsertionEffect(() => {
      insertRuntimeTheme(context.sheet, theme);
      context.sheet.flush();
    });
  }

  return current.resolved;
}
