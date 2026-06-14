import { getTokenVar } from '../../atomic/token';
import { RUNTIME_CONFIG } from '../../config';
import { isStyleTokenData } from '../../style';
import type { Falsy, StyleTokenInput } from '../types';

export function getToken<T>(value: StyleTokenInput<T>): T | string;
export function getToken<T>(value: StyleTokenInput<T> | Falsy): T | string | Falsy;
export function getToken<T>(value: StyleTokenInput<T> | Falsy): T | string | Falsy {
  if (isStyleTokenData(value)) {
    return getTokenVar(value, RUNTIME_CONFIG.tokenVarPrefix);
  }

  return value as T | Falsy;
}
