import type { StyleTokenData } from '../../style/token';
import type { CSS } from '../utils/types';
import { type AtRuleCssOptions, buildNamedAtRuleCss } from './utils';

export type FontPaletteValuesObject = CSS.AtRule.FontPaletteValues;

export function buildFontPaletteValuesCss(
  name: string,
  descriptors: FontPaletteValuesObject,
  tokens: StyleTokenData[],
  tokenLookup: Set<string>,
  options?: AtRuleCssOptions,
) {
  return buildNamedAtRuleCss(
    'font-palette-values',
    name,
    descriptors,
    tokens,
    tokenLookup,
    options,
  );
}
