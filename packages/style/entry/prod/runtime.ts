import './config';

export type { CombinedStyle } from '../../runtime/core';
export { type CombinedStyleFor, combineStyle } from '../../runtime/extract/combineStyle';
export {
  type ClassNameProps,
  type ClassNameResult,
  getClassName,
  mergeClassName,
  mergeStyle,
} from '../../runtime/extract/getClassName';
export { getToken } from '../../runtime/extract/token';
export { bindScope, combineScope } from '../../runtime/style/scope';
export type { StyleProp, StyleTheme, StyleTokenInput, TokenTheme } from '../../runtime/types';

export type { CSS, CSSProperties, CSSPropertyName, CSSValueExclude } from '../../atomic/utils/types';
