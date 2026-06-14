import { normalizeDebugKeywordValue, normalizePropertyName, sanitizeDebugPropertyName } from '../utils/debug';
import { type DebugValueName, getDebugValueName } from './value';

const PROPERTY_ALIASES: Record<string, string> = {
  'border-radius': 'radius',
  'flex-direction': 'flex',
  'font-style': 'font',
  'font-weight': 'font',
  'grid-template-columns': 'grid-cols',
  'grid-template-rows': 'grid-rows',
  'align-items': 'items',
  'justify-content': 'justify',
  'z-index': 'zindex',
  'pointer-events': 'pointer',
};

const KEYWORD_VALUE_PROPERTIES = new Set([
  'align-content',
  'align-items',
  'align-self',
  'background-repeat',
  'background-size',
  'border-collapse',
  'border-style',
  'box-sizing',
  'clear',
  'cursor',
  'display',
  'flex-direction',
  'flex-wrap',
  'float',
  'font-weight',
  'font-style',
  'justify-content',
  'justify-items',
  'justify-self',
  'list-style-position',
  'list-style-type',
  'object-fit',
  'object-position',
  'overflow',
  'overflow-x',
  'overflow-y',
  'pointer-events',
  'place-content',
  'place-items',
  'place-self',
  'position',
  'resize',
  'table-layout',
  'text-align',
  'text-decoration-line',
  'text-transform',
  'user-select',
  'vertical-align',
  'visibility',
  'white-space',
]);

const ARBITRARY_VALUE_PROPERTIES = new Set([
  'font-weight',
]);

export type DebugPropertyName = DebugValueName & {
  property: string;
};

export function getDebugPropertyName(
  property: string,
  value: string,
  maxLength: number,
  valueMaxLength: number,
): DebugPropertyName | null {
  if (!property) return null;

  const normalized = normalizePropertyName(property);
  const name = PROPERTY_ALIASES[normalized] || sanitizeDebugPropertyName(normalized);

  if (!name) return null;

  const valueName = getDebugValueName(name, value, maxLength, valueMaxLength);

  return {
    property: name,
    ...withKeywordValueFallback(
      normalized,
      value,
      valueMaxLength,
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
  valueMaxLength: number,
  valueName: DebugValueName,
): DebugValueName {
  if (valueName.value || valueName.arbitraryValue || !valueMaxLength) return valueName;
  if (!KEYWORD_VALUE_PROPERTIES.has(property)) return valueName;

  const normalized = normalizeDebugKeywordValue(value);
  if (!normalized || normalized.length > valueMaxLength) return valueName;

  return {
    value: normalized,
    arbitraryValue: null,
  };
}
