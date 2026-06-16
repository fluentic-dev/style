import { symbol } from '../utils/const';
import type { StyleTokenData } from './token';

export const AT_RULE_REF: unique symbol = symbol('atRule.ref');

export const AT_RULE_REF_TYPE_KEYFRAMES = 1;
export const AT_RULE_REF_TYPE_FONT_FACE = 2;
export const AT_RULE_REF_TYPE_POSITION_TRY = 3;
export const AT_RULE_REF_TYPE_COUNTER_STYLE = 4;
export const AT_RULE_REF_TYPE_PROPERTY = 5;
export const AT_RULE_REF_TYPE_SCROLL_TIMELINE = 6;
export const AT_RULE_REF_TYPE_VIEW_TIMELINE = 7;
export const AT_RULE_REF_TYPE_FONT_PALETTE_VALUES = 8;

export type AtRuleRefType =
  | typeof AT_RULE_REF_TYPE_KEYFRAMES
  | typeof AT_RULE_REF_TYPE_FONT_FACE
  | typeof AT_RULE_REF_TYPE_POSITION_TRY
  | typeof AT_RULE_REF_TYPE_COUNTER_STYLE
  | typeof AT_RULE_REF_TYPE_PROPERTY
  | typeof AT_RULE_REF_TYPE_SCROLL_TIMELINE
  | typeof AT_RULE_REF_TYPE_VIEW_TIMELINE
  | typeof AT_RULE_REF_TYPE_FONT_PALETTE_VALUES;

export type AtRuleRefData = {
  type: AtRuleRefType;
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
