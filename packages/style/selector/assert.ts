import type { SelectorAssert } from './types';
import { isAttrArg, isLocalSelector, isPseudoArgSelector, isRawValue, isTagSelector } from './validate';

export function assertSelector(type: SelectorAssert | null, value: string) {
  assertSelectorNotEmpty(value);

  if (!type) return;

  if (typeof type === 'function') {
    return type(value);
  }

  switch (type) {
    case 'local':
      return assertLocalSelector(value);

    case 'arg':
      return assertPseudoArgSelector(value);

    case 'tag':
      return assertTagSelector(value);

    case 'attr':
      return assertAttrSelector(value);

    case 'value':
      return assertRawValue(value);

    case 'media':
      return assertMediaQuery(value);

    case 'supports':
      return assertSupportsQuery(value);

    case 'container':
      return assertContainerQuery(value);

    default:
      throw new Error('unsupported selector type: ' + value);
  }
}

export function assertSelectorNotEmpty(value: string) {
  if (!value) {
    throw new Error('selector cannot be empty');
  }
}

export function assertLocalSelector(value: string) {
  if (!isLocalSelector(value)) {
    throw new Error(
      'selector must target the current element only and cannot contain tags, combinators, or multiple selectors',
    );
  }
}

export function assertPseudoArgSelector(value: string) {
  if (!isPseudoArgSelector(value)) {
    throw new Error(
      'pseudo selector argument must contain only tags or selectors targeting the current element',
    );
  }
}

export function assertTagSelector(value: string) {
  if (!isTagSelector(value)) {
    throw new Error(
      'selector must be a single tag selector',
    );
  }
}

export function assertAttrSelector(value: string) {
  if (!isAttrArg(value)) {
    throw new Error(
      'attribute selector value must not include "[" or "]"',
    );
  }
}

export function assertRawValue(value: string) {
  if (!isRawValue(value)) {
    throw new Error(
      'value must not contain "{" or "}"',
    );
  }
}

export function assertMediaQuery(value: string) {
  if (!isRawValue(value)) {
    throw new Error(
      'media query must not contain "{" or "}"',
    );
  }
}

export function assertSupportsQuery(value: string) {
  if (!isRawValue(value)) {
    throw new Error(
      'supports query must not contain "{" or "}"',
    );
  }
}

export function assertContainerQuery(value: string) {
  if (!isRawValue(value)) {
    throw new Error(
      'container query must not contain "{" or "}"',
    );
  }
}
