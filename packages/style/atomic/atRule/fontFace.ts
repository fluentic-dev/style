import type { NamedAtRuleFormat, TokenNameFormat } from '../../config/types';
import type { StyleTokenData } from '../../style/token';
import type { CSS } from '../utils/types';
import { buildAtRuleDeclarationCss, createAtRuleNameFormatter } from './utils';

export type FontFaceObject = CSS.AtRule.FontFace;

export const FONT_FACE_AT_RULE = 'font-face';

export const formatFontFaceName = createAtRuleNameFormatter(
  'font[-(name)]-$hash',
);

export function buildFontFaceCss(
  format: NamedAtRuleFormat | null,
  name: string | null,
  id: string,
  descriptors: FontFaceObject,
  tokens: StyleTokenData[],
  tokenLookup: Set<string>,
  tokenNameFormat: TokenNameFormat | null,
) {
  name = formatFontFaceName(format, id, { name });

  let css = buildAtRuleDeclarationCss(
    descriptors,
    tokens,
    tokenLookup,
    tokenNameFormat,
    true,
    (property) => property !== 'fontFamily',
  );

  css = `@${FONT_FACE_AT_RULE} { font-family: ${name}; ${css} }`;

  return { name, css };
}
