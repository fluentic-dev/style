import { parse } from 'css-what';
import type { ItemSelector } from './data';
import {
  assertManualSelectorSyntax,
  type ManualSelectorInput,
  normalizeManualSelectors as normalizeManualSelectorsCore,
} from './selector_override_core';

export type { ManualSelectorInput } from './selector_override_core';

export function normalizeManualSelectors(input: ManualSelectorInput): ItemSelector[] {
  return normalizeManualSelectorsCore(input, assertManualSelector);
}

function assertManualSelector(selector: string) {
  assertManualSelectorSyntax(selector);

  const ampersandIndex = selector.indexOf('&');
  const hasOptionalAmpersand = selector.startsWith('&?');
  const ampersandSelector = hasOptionalAmpersand ? selector.slice(2) : selector.slice(1);
  const parsedSelector = ampersandIndex === 0
    ? '*' + ampersandSelector
    : selector;

  try {
    parse(parsedSelector);
  } catch {
    throw new Error('selector is invalid: ' + selector);
  }
}
