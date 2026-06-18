import { buildFontPaletteValuesCss, type FontPaletteValuesObject } from '../atomic/atRule/fontPaletteValues';
import { CSS_EXTRA_CONFIG } from '../config/config/css_extra';
import type { AtRuleRef } from '../style/valueRef';
import { createIdCounter, type StableId } from '../utils/id';
import { createNamedAtRuleRef } from './utils';

export type { FontPaletteValuesObject };

const idCounter = createIdCounter('fontPaletteValues');

export function createFontPaletteValues(descriptors: FontPaletteValuesObject): AtRuleRef;
export function createFontPaletteValues(descriptors: FontPaletteValuesObject, stableId?: StableId): AtRuleRef {
  return createNamedAtRuleRef({
    format: CSS_EXTRA_CONFIG.namedRuleFormat.fontPaletteValues,
    buildCss: buildFontPaletteValuesCss,
    value: descriptors,
    idCounter,
    stableId,
  });
}
