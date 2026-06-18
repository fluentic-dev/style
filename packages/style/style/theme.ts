import { createThemeClassName } from '../atomic/theme';
import { createThemeData } from '../builder/data/create';
import type { ThemeData } from '../builder/data/data';
import { CSS_CONFIG } from '../config/config/css';
import { createIdCounter, getId, type StableId } from '../utils/id';
import type { StyleTokenOverride } from './token';

const idCounter = createIdCounter('theme');

export function resetStyleThemeIdCounter() {
  idCounter.value = 0;
}

export function createTheme(
  tokens: readonly StyleTokenOverride[],
  stableId?: StableId | string,
): ThemeData {
  const normalizedStableId = typeof stableId === 'string'
    ? { name: stableId, id: stableId }
    : stableId;
  const { name, id } = getId(idCounter, normalizedStableId || null);

  const className = createThemeClassName(
    name,
    id,
    CSS_CONFIG.themeNameFormat || null,
  );

  return createThemeData(null, id, className, tokens);
}
