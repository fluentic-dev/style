import { buildFontFaceCss, type FontFaceObject } from '../atomic/atRule/fontFace';
import { AT_RULE_REF_TYPE_FONT_FACE, type AtRuleRef, createAtRuleRef } from '../style/valueRef';
import { createAtRuleCssOptions, createAtRuleIdCounter, createAtRuleName, createAtRuleTokens } from './utils';

export { fontSrc } from '../atomic/atRule/fontSrc';
export type { FontFaceObject };

const idCounter = createAtRuleIdCounter('fontFace');

export function createFontFace(descriptors: FontFaceObject): AtRuleRef;
export function createFontFace(descriptors: FontFaceObject, stableId?: string): AtRuleRef {
  if (typeof descriptors.src !== 'string') {
    throw new Error('createFontFace "src" must be a static string');
  }

  const id = stableId || (idCounter.value++).toString();
  const name = createAtRuleName(id, 'ff');

  const { tokens, tokenLookup } = createAtRuleTokens();
  const css = buildFontFaceCss(name, descriptors, tokens, tokenLookup, createAtRuleCssOptions());

  return createAtRuleRef({
    type: AT_RULE_REF_TYPE_FONT_FACE,
    key: 'font-face:' + name,
    value: name,
    css,
    tokens: tokens.length ? tokens : undefined,
  });
}
