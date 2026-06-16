import { buildKeyframesCss, type KeyframesObject } from '../atomic/atRule/keyframes';
import { AT_RULE_REF_TYPE_KEYFRAMES, type AtRuleRef, createAtRuleRef } from '../style/valueRef';
import { createAtRuleCssOptions, createAtRuleIdCounter, createAtRuleName, createAtRuleTokens } from './utils';

export type { KeyframesObject };

const idCounter = createAtRuleIdCounter('keyframes');

export function createKeyframes(frames: KeyframesObject): AtRuleRef;
export function createKeyframes(frames: KeyframesObject, stableId?: string): AtRuleRef {
  const id = stableId || (idCounter.value++).toString();
  const name = createAtRuleName(id, 'kf');

  const { tokens, tokenLookup } = createAtRuleTokens();
  const css = buildKeyframesCss(name, frames, tokens, tokenLookup, createAtRuleCssOptions());

  return createAtRuleRef({
    type: AT_RULE_REF_TYPE_KEYFRAMES,
    key: 'keyframes:' + name,
    value: name,
    css,
    tokens: tokens.length ? tokens : undefined,
  });
}
