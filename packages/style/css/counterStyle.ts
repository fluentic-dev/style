import { buildCounterStyleCss, type CounterStyleObject } from '../atomic/atRule/counterStyle';
import { AT_RULE_REF_TYPE_COUNTER_STYLE, type AtRuleRef, createAtRuleRef } from '../style/valueRef';
import {
  createAtRuleCssOptions,
  createAtRuleIdCounter,
  createAtRuleName,
  createAtRuleTokens,
  nextAtRuleId,
} from './utils';

export type { CounterStyleObject };

const idCounter = createAtRuleIdCounter('counterStyle');

export function createCounterStyle(descriptors: CounterStyleObject): AtRuleRef;
export function createCounterStyle(
  descriptors: CounterStyleObject,
  stableId?: string,
): AtRuleRef {
  const id = nextAtRuleId(idCounter, stableId);
  const name = createAtRuleName(id, 'cs');

  const { tokens, tokenLookup } = createAtRuleTokens();
  const css = buildCounterStyleCss(name, descriptors, tokens, tokenLookup, createAtRuleCssOptions());

  return createAtRuleRef({
    type: AT_RULE_REF_TYPE_COUNTER_STYLE,
    key: 'counter-style:' + name,
    value: name,
    css,
    tokens: tokens.length ? tokens : undefined,
  });
}
