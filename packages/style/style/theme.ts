import { createThemeClassName } from '../atomic/theme';
import { createThemeData } from '../builder/data/create';
import type { ThemeData } from '../builder/data/data';
import { RUNTIME_CONFIG } from '../config';
import type { StyleTokenOverride } from './token';

let themeIdCounter = 0;

export function resetStyleThemeIdCounter() {
  themeIdCounter = 0;
}

export function createTheme(
  tokens: readonly StyleTokenOverride[],
  debugId?: string,
): ThemeData {
  const id = debugId || (themeIdCounter++).toString();
  const className = createThemeClassName(id, RUNTIME_CONFIG);

  return createThemeData(null, id, className, tokens);
}
