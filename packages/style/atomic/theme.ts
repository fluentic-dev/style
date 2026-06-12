import type { CssConfig } from '../config/types';
import { hashString } from '../utils/hash';

export type ThemeClassNameConfig = Pick<CssConfig, 'classNamePrefix' | 'themeNamePrefix'>;

export function createThemeClassName(
  id: string,
  config: ThemeClassNameConfig,
) {
  return config.classNamePrefix + config.themeNamePrefix + getIdentifierSafeHash(hashString(id));
}

function getIdentifierSafeHash(hash: string) {
  const first = hash.charCodeAt(0);
  if (first < 48 || first > 57) return hash;

  return String.fromCharCode(97 + first - 48) + hash.slice(1);
}
