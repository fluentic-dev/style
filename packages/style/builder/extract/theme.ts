import { createThemeData, type ThemeData } from '../data';

export function createExtractedTheme(
  id: string,
  className: string,
): ThemeData {
  return createThemeData(null, id, className, []);
}
