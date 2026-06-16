import type { StyleTokenData } from '../../style/token';
import type { CSS } from '../utils/types';
import { type AtRuleCssOptions, buildAtRuleDeclarationCss } from './utils';

export type FontFaceObject = CSS.AtRule.FontFace;

export function buildFontFaceCss(
  name: string,
  descriptors: FontFaceObject,
  tokens: StyleTokenData[],
  tokenLookup: Set<string>,
  options?: AtRuleCssOptions,
) {
  const css = buildAtRuleDeclarationCss(
    descriptors,
    tokens,
    tokenLookup,
    (property) => property !== 'fontFamily',
    { ...options, rawValue: true },
  );

  return `@font-face {font-family: ${name};${css}}`;
}
