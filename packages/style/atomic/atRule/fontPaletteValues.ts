import type { NamedAtRuleFormat, TokenNameFormat } from '../../config/types';
import type { StyleTokenData } from '../../style/token';
import type { CSS } from '../utils/types';
import { buildNamedAtRuleCss, createAtRuleNameFormatter } from './utils';

export type FontPaletteValuesObject = CSS.AtRule.FontPaletteValues;

export const FONT_PALETTE_VALUES_AT_RULE = 'font-palette-values';

export const formatFontPaletteValuesName = createAtRuleNameFormatter(
  'font-palettle[-(name)]-$hash',
  '--',
);

export function buildFontPaletteValuesCss(
  format: NamedAtRuleFormat | null,
  name: string | null,
  id: string,
  descriptors: FontPaletteValuesObject,
  tokens: StyleTokenData[],
  tokenLookup: Set<string>,
  tokenNameFormat: TokenNameFormat | null,
) {
  name = formatFontPaletteValuesName(format, id, { name });

  const css = buildNamedAtRuleCss(
    FONT_PALETTE_VALUES_AT_RULE,
    name,
    descriptors,
    tokens,
    tokenLookup,
    tokenNameFormat,
  );

  return { name, css };
}
