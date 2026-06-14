import { createThemeData } from '../data/create';
import type { ThemeData } from '../data/data';

export function createExtractedTheme(
  id: string,
  className: string,
): ThemeData {
  return createThemeData(null, id, className, []);
}
