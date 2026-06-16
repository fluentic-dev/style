import { buildPositionTryCss, type PositionTryObject } from '../atomic/atRule/positionTry';
import { AT_RULE_REF_TYPE_POSITION_TRY, type AtRuleRef, createAtRuleRef } from '../style/valueRef';
import {
  createAtRuleCssOptions,
  createAtRuleIdCounter,
  createAtRuleName,
  createAtRuleTokens,
  nextAtRuleId,
} from './utils';

export type { PositionTryObject };

const idCounter = createAtRuleIdCounter('positionTry');

export function createPositionTry(descriptors: PositionTryObject): AtRuleRef;
export function createPositionTry(descriptors: PositionTryObject, stableId?: string): AtRuleRef {
  const id = nextAtRuleId(idCounter, stableId);
  const name = createAtRuleName(id, 'pt', true);

  const { tokens, tokenLookup } = createAtRuleTokens();
  const css = buildPositionTryCss(name, descriptors, tokens, tokenLookup, createAtRuleCssOptions());

  return createAtRuleRef({
    type: AT_RULE_REF_TYPE_POSITION_TRY,
    key: 'position-try:' + name,
    value: name,
    css,
    tokens: tokens.length ? tokens : undefined,
  });
}
