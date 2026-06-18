import { getTokenVar } from '../../atomic/token';
import { CSS_CONFIG } from '../../config/config/css';
import { isStyleTokenData } from '../../style/token';
import type { Falsy, StyleTokenInput } from '../types';

export function getToken<T>(value: StyleTokenInput<T>): T | string;
export function getToken<T>(value: StyleTokenInput<T> | Falsy): T | string | Falsy;
export function getToken<T>(value: StyleTokenInput<T> | Falsy): T | string | Falsy {
  if (isStyleTokenData(value)) {
    return getTokenVar(value, CSS_CONFIG.tokenNameFormat ?? null);
  }

  return value as T | Falsy;
}
