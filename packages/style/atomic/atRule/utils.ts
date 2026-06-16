import { getStyleTokenId, isStyleTokenData, type StyleTokenData } from '../../style/token';
import { hashString } from '../../utils/hash';
import { getCssPropertyName } from '../property';
import { getTokenVar } from '../token';
import { sanitizeCssIdentName } from '../utils/css';
import { getCssPropertyValue } from '../value';

export type AtRuleCssOptions = {
  rawValue?: boolean;
  tokenVarPrefix?: string;
};

export function createAtRuleName(
  id: string,
  prefix: string,
  dashed: boolean = false,
  classNamePrefix: string = '',
) {
  const debug = sanitizeCssIdentName(id);
  const hash = hashString(id);
  const base = debug ? `${prefix}-${debug}-${hash}` : `${prefix}-${hash}`;
  const name = dashed ? `--${base}` : base;

  return classNamePrefix
    ? `${dashed ? '--' : ''}${classNamePrefix}-${base}`
    : name;
}

export function buildAtRuleDeclarationCss(
  style: Record<string, any>,
  tokens: StyleTokenData[],
  tokenLookup: Set<string>,
  shouldInclude?: (property: string) => boolean,
  options?: AtRuleCssOptions,
) {
  let css = '';

  for (const property in style) {
    if (shouldInclude && !shouldInclude(property)) continue;

    let value = style[property];

    if (Array.isArray(value) && value.length === 2 && typeof value[0] === 'number') {
      value = value[1];
    }

    if (isStyleTokenData(value)) {
      const tokenId = getStyleTokenId(value);
      if (!tokenLookup.has(tokenId)) {
        tokenLookup.add(tokenId);
        tokens.push(value);
      }

      css += `${getCssPropertyName(property)}: ${getTokenVar(value, options?.tokenVarPrefix ?? '')};`;
      continue;
    }

    const valueString = String(value ?? '');

    css += `${getCssPropertyName(property)}: ${
      options?.rawValue ? valueString : getCssPropertyValue(property, valueString)
    };`;
  }

  return css;
}

export function buildNamedAtRuleCss(
  atRule: string,
  name: string,
  descriptors: object,
  tokens: StyleTokenData[],
  tokenLookup: Set<string>,
  options?: AtRuleCssOptions,
) {
  return `@${atRule} ${name} {${
    buildAtRuleDeclarationCss(
      descriptors,
      tokens,
      tokenLookup,
      undefined,
      { ...options, rawValue: true },
    )
  }}`;
}
