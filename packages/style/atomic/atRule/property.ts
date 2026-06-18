import type { NamedAtRuleFormat, TokenNameFormat } from '../../config/types';
import type { StyleTokenData } from '../../style/token';
import { buildNamedAtRuleCss, createAtRuleNameFormatter } from './utils';

export type PropertyObject = {
  syntax: string;
  inherits: boolean;
  initialValue: string | number;
};

export const PROPERTY_AT_RULE = 'property';

export const formatPropertyName = createAtRuleNameFormatter(
  '[-(name)]-$hash',
  '--',
);

export function buildPropertyCss(
  format: NamedAtRuleFormat | null,
  name: string | null,
  id: string,
  descriptors: PropertyObject,
  tokens: StyleTokenData[],
  tokenLookup: Set<string>,
  tokenNameFormat: TokenNameFormat | null,
) {
  name = formatPropertyName(format, id, { name });

  const css = buildNamedAtRuleCss(
    PROPERTY_AT_RULE,
    name,
    descriptors,
    tokens,
    tokenLookup,
    tokenNameFormat,
  );

  return { css, name };
}
