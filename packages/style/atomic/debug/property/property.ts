import { normalizeDebugKeywordValue, normalizePropertyName, sanitizeDebugPropertyName } from '../../utils/debug';
import { type DebugValueName, getDebugValueName } from '../value';
import { ARBITRARY_VALUE_PROPERTIES, KEYWORD_VALUE_PROPERTIES, PROPERTY_ALIASES } from './data';

export type DebugPropertyName = DebugValueName & {
  property: string;
};

export function getDebugPropertyName(
  property: string,
  value: string,
): DebugPropertyName | null {
  if (!property) return null;

  const normalized = normalizePropertyName(property);
  const name = PROPERTY_ALIASES[normalized] || sanitizeDebugPropertyName(normalized);

  if (!name) return null;

  const valueName = getDebugValueName(value);

  return {
    property: name,
    ...withKeywordValueFallback(
      normalized,
      value,
      withArbitraryValueFallback(normalized, valueName),
    ),
  };
}

function withArbitraryValueFallback(
  property: string,
  valueName: DebugValueName,
): DebugValueName {
  if (!valueName.arbitraryValue || ARBITRARY_VALUE_PROPERTIES.has(property)) return valueName;

  return {
    value: valueName.value,
    arbitraryValue: null,
  };
}

function withKeywordValueFallback(
  property: string,
  value: string,
  valueName: DebugValueName,
): DebugValueName {
  if (valueName.value || valueName.arbitraryValue) return valueName;
  if (!KEYWORD_VALUE_PROPERTIES.has(property)) return valueName;

  const normalized = normalizeDebugKeywordValue(value);
  if (!normalized) return valueName;

  return {
    value: normalized,
    arbitraryValue: null,
  };
}
