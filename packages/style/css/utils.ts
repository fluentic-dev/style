import { createAtRuleName as createAtomicAtRuleName } from '../atomic/atRule/utils';
import { RUNTIME_CONFIG } from '../config';
import type { StyleTokenData } from '../style/token';
import { globalData } from '../utils/global';

export function createAtRuleName(id: string, prefix: string, dashed: boolean = false) {
  return createAtomicAtRuleName(id, prefix, dashed, RUNTIME_CONFIG.classNamePrefix);
}

export function createAtRuleIdCounter(key: string) {
  return globalData('atRule.' + key + '.idCounter', () => ({ value: 0 }));
}

export function createAtRuleTokens() {
  return {
    tokens: [] as StyleTokenData[],
    tokenLookup: new Set<string>(),
  };
}

export function createAtRuleCssOptions() {
  return {
    tokenVarPrefix: RUNTIME_CONFIG.tokenVarPrefix,
  };
}

export function nextAtRuleId(counter: { value: number; }, stableId: string | undefined) {
  return stableId || (counter.value++).toString();
}
