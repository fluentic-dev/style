import { buildFontFaceCss, type FontFaceObject } from '../atomic/atRule/fontFace';
import { CSS_EXTRA_CONFIG } from '../config/config/css_extra';
import type { AtRuleRef } from '../style/valueRef';
import { createIdCounter, type StableId } from '../utils/id';
import { createNamedAtRuleRef } from './utils';

export { fontSrc } from '../atomic/atRule/fontSrc';
export type { FontFaceObject };

const idCounter = createIdCounter('fontFace');

export function createFontFace(descriptors: FontFaceObject): AtRuleRef;
export function createFontFace(descriptors: FontFaceObject, stableId?: StableId): AtRuleRef {
  if (typeof descriptors.src !== 'string') {
    throw new Error('createFontFace "src" must be a static string');
  }

  return createNamedAtRuleRef({
    format: CSS_EXTRA_CONFIG.namedRuleFormat.fontFace,
    buildCss: buildFontFaceCss,
    value: descriptors,
    idCounter,
    stableId,
  });
}
