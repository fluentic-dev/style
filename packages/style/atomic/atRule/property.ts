import type { StyleTokenData } from '../../style/token';
import { type AtRuleCssOptions, buildNamedAtRuleCss } from './utils';

export type PropertyObject = {
  syntax: string;
  inherits: boolean;
  initialValue: string | number;
};

export function buildPropertyCss(
  name: `--${string}`,
  descriptors: PropertyObject,
  tokens: StyleTokenData[],
  tokenLookup: Set<string>,
  options?: AtRuleCssOptions,
) {
  return buildNamedAtRuleCss(
    'property',
    name,
    descriptors,
    tokens,
    tokenLookup,
    options,
  );
}
