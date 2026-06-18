import type { NamedAtRuleFormat, TokenNameFormat } from '../../config/types';
import type { StyleTokenData } from '../../style/token';
import type { CSS } from '../utils/types';
import { buildNamedAtRuleCss, createAtRuleNameFormatter } from './utils';

export type CounterStyleObject = CSS.AtRule.CounterStyle;

export const COUNTER_STYLE_AT_RULE = 'counter-style';

export const formatCounterStyleName = createAtRuleNameFormatter(
  'counter-style[-(name)]-$hash',
);

export function buildCounterStyleCss(
  format: NamedAtRuleFormat | null,
  name: string | null,
  id: string,
  descriptors: CounterStyleObject,
  tokens: StyleTokenData[],
  tokenLookup: Set<string>,
  tokenNameFormat: TokenNameFormat | null,
) {
  name = formatCounterStyleName(format, id, { name });

  const css = buildNamedAtRuleCss(
    COUNTER_STYLE_AT_RULE,
    name,
    descriptors,
    tokens,
    tokenLookup,
    tokenNameFormat,
  );

  return { name, css };
}
