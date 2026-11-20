import type { ItemSelector } from './data';
import type { CreateSheetOptions } from './data';
import { GLOBAL_SHEET_SELECTOR_ANCHOR, SHEET_SELECTOR_ANCHOR } from './data';

export type ManualSelectorInput = string | readonly string[];

export function normalizeManualSelectors(
  input: ManualSelectorInput,
  assertManualSelector: (selector: string) => void,
): ItemSelector[] {
  const selectors = Array.isArray(input) ? input : [input];

  if (!selectors.length) {
    throw new Error('selector array cannot be empty');
  }

  return selectors.flatMap((selector) => normalizeManualSelector(selector, assertManualSelector));
}

export function assertManualSelectorSyntax(selector: string) {
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
}

export function setSheetSelectorOptions(selector: ItemSelector, options: CreateSheetOptions): ItemSelector {
  if (options.specificity === undefined && options.layer === undefined) return selector;

  const text = Array.isArray(selector) ? selector[0] : selector;
  const optionMarker = ':' + (options.specificity ?? '') + ':' + (
    typeof options.layer === 'string'
      ? JSON.stringify(options.layer)
      : options.layer === undefined
      ? ''
      : options.layer
      ? '1'
      : '0'
  );
  const weighted = SHEET_SELECTOR_ANCHOR + optionMarker + '\0' + text.slice(SHEET_SELECTOR_ANCHOR.length);

  return Array.isArray(selector) ? [weighted, selector[1]] : weighted;
}

function normalizeManualSelector(
  selector: string,
  assertManualSelector: (selector: string) => void,
): ItemSelector[] {
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

/** Convert a normalized explicit selector into an unscoped sheet selector. */
export function setGlobalSheetSelectorOptions(
  selector: ItemSelector,
  options: Pick<CreateSheetOptions, 'layer'>,
): ItemSelector {
  const text = Array.isArray(selector) ? selector[0] : selector;
  const suffix = text.slice(SHEET_SELECTOR_ANCHOR.length);
  if (!suffix.startsWith(' ') || !suffix.trim()) {
    throw new Error('createGlobalSheet requires explicit selectors without an ampersand anchor');
  }
  const global = GLOBAL_SHEET_SELECTOR_ANCHOR + JSON.stringify(options.layer ?? null) + '\0' + suffix.trimStart();
  return Array.isArray(selector) ? [global, selector[1]] : global;
}
