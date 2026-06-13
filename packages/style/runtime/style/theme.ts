import { useInsertionEffect, useRef } from 'react';
import type { ThemeData } from '../../builder/data';
import { RUNTIME_CONFIG } from '../../config';
import { getGlobalSheet, insertRuntimeTheme } from '../sheet';
import { createCssTheme, type CssResolvedTheme } from '../core/data';

export function useTheme(theme: ThemeData): CssResolvedTheme {
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
      const sheet = getGlobalSheet();

      insertRuntimeTheme(sheet, theme);
      sheet.flush();
    });
  }

  return current.resolved;
}
