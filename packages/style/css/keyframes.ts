import { buildKeyframesCss, type KeyframesObject } from '../atomic/atRule/keyframes';
import { CSS_EXTRA_CONFIG } from '../config/config/css_extra';
import type { AtRuleRef } from '../style/valueRef';
import { createIdCounter, type StableId } from '../utils/id';
import { createNamedAtRuleRef } from './utils';

export type { KeyframesObject };

const idCounter = createIdCounter('keyframes');

export function createKeyframes(frames: KeyframesObject): AtRuleRef;
export function createKeyframes(frames: KeyframesObject, stableId?: StableId): AtRuleRef {
  return createNamedAtRuleRef({
    format: CSS_EXTRA_CONFIG.namedRuleFormat.keyframes,
    buildCss: buildKeyframesCss,
    value: frames,
    idCounter,
    stableId,
  });
}
