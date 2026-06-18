import { type NamedAtRuleFormat, type NamedAtRuleInfo, type TokenNameFormat } from '../../config/types';
import { getStyleTokenId, isStyleTokenData, type StyleTokenData } from '../../style/token';
import { getCssPropertyName } from '../property';
import { getTokenVar } from '../token';
import { getIdentifierSafeHash } from '../utils/css';
import { createNameFormatter } from '../utils/format';
import { getCssPropertyValue } from '../value';

export function createAtRuleNameFormatter(defaultFormat: NamedAtRuleFormat, prefix?: string) {
  const formatter = createNameFormatter<NamedAtRuleInfo>(['name']);

  return (
    format: NamedAtRuleFormat | null,
    id: string,
    info: NamedAtRuleInfo,
  ) => {
    const hash = getIdentifierSafeHash(id);
    const name = formatter(format || defaultFormat, hash, info);

    if (!prefix) return name;

    return name.startsWith(prefix) ? name : prefix + name;
  };
}

export function buildNamedAtRuleCss(
  atRule: string,
  name: string,
  descriptors: object,
  tokens: StyleTokenData[],
  tokenLookup: Set<string>,
  tokenNameFormat: TokenNameFormat | null,
) {
  return `@${atRule} ${name} {${
    buildAtRuleDeclarationCss(
      descriptors,
      tokens,
      tokenLookup,
      tokenNameFormat,
      true,
    )
  }}`;
}

export function buildAtRuleDeclarationCss(
  style: Record<string, any>,
  tokens: StyleTokenData[],
  tokenLookup: Set<string>,
  tokenNameFormat: TokenNameFormat | null,
  rawValue: boolean,
  shouldInclude?: (property: string) => boolean,
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

      css += `${getCssPropertyName(property)}: ${getTokenVar(value, tokenNameFormat)};`;
      continue;
    }

    const valueString = String(value ?? '');

    css += `${getCssPropertyName(property)}: ${rawValue ? valueString : getCssPropertyValue(property, valueString)};`;
  }

  return css;
}
