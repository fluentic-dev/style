import { symbol } from '../utils/symbol';
import type { StyleTokenData } from './token';

export const AT_RULE_REF: unique symbol = symbol('atRule.ref');

export type AtRuleRefData = {
  key: string;
  value: string;
  css: string | null;
  tokens?: readonly StyleTokenData[];
};

export type AtRuleRef = AtRuleRefData & {
  [AT_RULE_REF]: true;
};

export function createAtRuleRef(data: AtRuleRefData): AtRuleRef {
  return { [AT_RULE_REF]: true, ...data };
}

export function isAtRuleRef(value: unknown): value is AtRuleRef {
  return !!value &&
    typeof value === 'object' &&
    (value as AtRuleRef)[AT_RULE_REF] === true;
}
