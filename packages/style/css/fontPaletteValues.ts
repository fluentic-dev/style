import { buildFontPaletteValuesCss, type FontPaletteValuesObject } from '../atomic/atRule/fontPaletteValues';
import { AT_RULE_REF_TYPE_FONT_PALETTE_VALUES, type AtRuleRef, createAtRuleRef } from '../style/valueRef';
import {
  createAtRuleCssOptions,
  createAtRuleIdCounter,
  createAtRuleName,
  createAtRuleTokens,
  nextAtRuleId,
} from './utils';

export type { FontPaletteValuesObject };

const idCounter = createAtRuleIdCounter('fontPaletteValues');

export function createFontPaletteValues(descriptors: FontPaletteValuesObject): AtRuleRef;
export function createFontPaletteValues(descriptors: FontPaletteValuesObject, stableId?: string): AtRuleRef {
  const id = nextAtRuleId(idCounter, stableId);
  const name = createAtRuleName(id, 'fp', true);

  const { tokens, tokenLookup } = createAtRuleTokens();
  const css = buildFontPaletteValuesCss(name, descriptors, tokens, tokenLookup, createAtRuleCssOptions());

  return createAtRuleRef({
    type: AT_RULE_REF_TYPE_FONT_PALETTE_VALUES,
    key: 'font-palette-values:' + name,
    value: name,
    css,
    tokens: tokens.length ? tokens : undefined,
  });
}
