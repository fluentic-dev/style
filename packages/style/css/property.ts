import { buildPropertyCss, type PropertyObject } from '../atomic/atRule/property';
import { AT_RULE_REF_TYPE_PROPERTY, type AtRuleRef, createAtRuleRef } from '../style/valueRef';
import { createAtRuleCssOptions, createAtRuleTokens } from './utils';

export type { PropertyObject };

export function createProperty(
  name: `--${string}`,
  descriptors: PropertyObject,
): AtRuleRef {
  if (typeof name !== 'string' || !name.startsWith('--')) {
    throw new Error('createProperty name must be a custom property name');
  }

  const { tokens, tokenLookup } = createAtRuleTokens();
  const css = buildPropertyCss(name, descriptors, tokens, tokenLookup, createAtRuleCssOptions());

  return createAtRuleRef({
    type: AT_RULE_REF_TYPE_PROPERTY,
    key: 'property:' + name,
    value: name,
    css,
    tokens: tokens.length ? tokens : undefined,
  });
}
