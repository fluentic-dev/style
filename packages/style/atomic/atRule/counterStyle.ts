import type { StyleTokenData } from '../../style/token';
import type { CSS } from '../utils/types';
import { type AtRuleCssOptions, buildNamedAtRuleCss } from './utils';

export type CounterStyleObject = CSS.AtRule.CounterStyle;

export function buildCounterStyleCss(
  name: string,
  descriptors: CounterStyleObject,
  tokens: StyleTokenData[],
  tokenLookup: Set<string>,
  options?: AtRuleCssOptions,
) {
  return buildNamedAtRuleCss(
    'counter-style',
    name,
    descriptors,
    tokens,
    tokenLookup,
    options,
  );
}
