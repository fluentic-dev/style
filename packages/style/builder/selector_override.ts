import { parse } from 'css-what';
import type { ItemSelector } from './data';
import { SHEET_SELECTOR_ANCHOR } from './data';

export type ManualSelectorInput = string | readonly string[];

export function normalizeManualSelectors(input: ManualSelectorInput): ItemSelector[] {
  const selectors = Array.isArray(input) ? input : [input];

  if (!selectors.length) {
    throw new Error('selector array cannot be empty');
  }

  return selectors.flatMap(normalizeManualSelector);
}

function normalizeManualSelector(selector: string): ItemSelector[] {
  const value = selector.trim();
  assertManualSelector(value);

  if (value.startsWith('&?')) {
    const suffix = value.slice(2);
    return suffix
      ? [
        SHEET_SELECTOR_ANCHOR + suffix,
        SHEET_SELECTOR_ANCHOR + ' ' + suffix,
      ]
      : [SHEET_SELECTOR_ANCHOR];
  }

  return [
    SHEET_SELECTOR_ANCHOR + (value.startsWith('&') ? value.slice(1) : ' ' + value),
  ];
}

function assertManualSelector(selector: string) {
  if (!selector) {
    throw new Error('selector cannot be empty');
  }

  if (selector.includes('{') || selector.includes('}')) {
    throw new Error('selector must not contain "{" or "}"');
  }

  if (selector.includes(',')) {
    throw new Error('selector must not contain ","; use an array of selectors instead');
  }

  const ampersandIndex = selector.indexOf('&');

  if (ampersandIndex > 0) {
    throw new Error('selector can only use "&" at the beginning');
  }

  const hasOptionalAmpersand = selector.startsWith('&?');
  const ampersandSelector = hasOptionalAmpersand ? selector.slice(2) : selector.slice(1);

  if (ampersandIndex === 0 && ampersandSelector && /^\s/.test(ampersandSelector)) {
    throw new Error('selector cannot have whitespace after "&"; omit "&" for descendant selectors');
  }

  const parsedSelector = ampersandIndex === 0
    ? '*' + ampersandSelector
    : selector;

  try {
    parse(parsedSelector);
  } catch {
    throw new Error('selector is invalid: ' + selector);
  }
}
