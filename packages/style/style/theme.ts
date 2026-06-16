import { createThemeClassName } from '../atomic/theme';
import { createThemeData } from '../builder/data/create';
import type { ThemeData } from '../builder/data/data';
import { RUNTIME_CONFIG } from '../config';
import { globalData } from '../utils/global';
import type { StyleTokenOverride } from './token';

type IdCounter = { value: number; };

let themeIdCounter: IdCounter | null = null;

function getThemeIdCounter() {
  return themeIdCounter ??= globalData('style.theme.idCounter', () => ({ value: 0 }));
}

export function resetStyleThemeIdCounter() {
  getThemeIdCounter().value = 0;
}

export function createTheme(
  tokens: readonly StyleTokenOverride[],
  debugId?: string,
): ThemeData {
  const id = debugId || (getThemeIdCounter().value++).toString();
  const className = createThemeClassName(id, RUNTIME_CONFIG);

  return createThemeData(null, id, className, tokens);
}
