import { createSelectorAssert } from './selector';
import type { SelectorAssert, SelectorAssertFn } from './types';
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

export function assertEnumSelector<const Values extends readonly string[]>(
  values: Values,
): SelectorAssertFn<Values[number]>;
export function assertEnumSelector<const Values extends readonly string[]>(
  ...values: Values
): SelectorAssertFn<Values[number]>;
export function assertEnumSelector<const Values extends readonly string[]>(
  ...input: [Values] | Values
): SelectorAssertFn<Values[number]> {
  const values = Array.isArray(input[0]) ? input[0] : input;

  return createSelectorAssert<Values[number]>((arg) => {
    if (!values.includes(arg)) {
      throw new Error(`value must be one of: ${values.join(', ')}`);
    }
  });
}

export const assertSelectorNotEmpty = createSelectorAssert((value) => {
  if (!value) {
    throw new Error('selector cannot be empty');
  }
});

export const assertLocalSelector = createSelectorAssert((value) => {
  if (!isLocalSelector(value)) {
    throw new Error(
      'selector must target the current element only and cannot contain tags, combinators, or multiple selectors',
    );
  }
});

export const assertPseudoArgSelector = createSelectorAssert((value) => {
  if (!isPseudoArgSelector(value)) {
    throw new Error(
      'pseudo selector argument must contain only tags or selectors targeting the current element',
    );
  }
});

export const assertTagSelector = createSelectorAssert((value) => {
  if (!isTagSelector(value)) {
    throw new Error(
      'selector must be a single tag selector',
    );
  }
});

export const assertAttrSelector = createSelectorAssert((value) => {
  if (!isAttrArg(value)) {
    throw new Error(
      'attribute selector value must not include "[" or "]"',
    );
  }
});

export const assertRawValue = createSelectorAssert((value) => {
  if (!isRawValue(value)) {
    throw new Error(
      'value must not contain "{" or "}"',
    );
  }
});

export const assertMediaQuery = createSelectorAssert((value) => {
  if (!isRawValue(value)) {
    throw new Error(
      'media query must not contain "{" or "}"',
    );
  }
});

export const assertSupportsQuery = createSelectorAssert((value) => {
  if (!isRawValue(value)) {
    throw new Error(
      'supports query must not contain "{" or "}"',
    );
  }
});

export const assertContainerQuery = createSelectorAssert((value) => {
  if (!isRawValue(value)) {
    throw new Error(
      'container query must not contain "{" or "}"',
    );
  }
});
