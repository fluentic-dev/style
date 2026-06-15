import type { types as BabelTypes } from '@babel/core';
import {
  SELECTOR_ARG,
  SELECTOR_ARGS,
  SELECTOR_AT_RULE,
  SELECTOR_CONTAINER,
  SELECTOR_MEDIA,
  SELECTOR_MERGE,
} from '../../../builder/data';
import type { CheckSelectorMode } from '../../../config';
import { assertLocalSelector, assertSelector } from '../../../selector/assert';
import type { Selector } from '../../../selector/types';
import type { EvalResult } from '../evaluator/types';

export const NonStaticSelectorValue = Symbol('NonStaticSelectorValue');

export type StaticSelectorValue =
  | string
  | string[]
  | typeof NonStaticSelectorValue;

const SELECTOR_ERROR_NODE = Symbol('SelectorErrorNode');

export type SelectorCompileError = Error & {
  [SELECTOR_ERROR_NODE]?: BabelTypes.Node;
};

export function getSelectorArgIndex(
  selector: Selector,
  args: BabelTypes.Node[],
) {
  const selectorText = selector.selector.trim();

  if (selectorText.startsWith(SELECTOR_AT_RULE)) {
    const isMedia = selectorText.startsWith(SELECTOR_MEDIA) ||
      selectorText.startsWith(SELECTOR_CONTAINER);

    return isMedia && args[0]?.type === 'NumericLiteral' ? 1 : 0;
  }

  if (selectorText.includes(SELECTOR_ARGS) || selectorText.includes(SELECTOR_ARG)) {
    return 0;
  }

  return null;
}

export function getStaticSelectorValue(
  node: BabelTypes.Node | null | undefined,
): StaticSelectorValue {
  if (!node) return NonStaticSelectorValue;

  if (node.type === 'StringLiteral') return node.value;
  if (node.type === 'NumericLiteral') return String(node.value);
  if (node.type === 'BooleanLiteral') return String(node.value);
  if (node.type === 'NullLiteral') return '';

  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
    return node.quasis.map((quasi) => quasi.value.cooked ?? quasi.value.raw).join('');
  }

  if (node.type === 'ArrayExpression') {
    const values: string[] = [];

    for (const element of node.elements) {
      if (!element || element.type === 'SpreadElement') return NonStaticSelectorValue;

      const value = getStaticSelectorValue(element);
      if (value === NonStaticSelectorValue || Array.isArray(value)) {
        return NonStaticSelectorValue;
      }

      values.push(value);
    }

    return values;
  }

  return NonStaticSelectorValue;
}

export function validateSelectorValue(
  fnLabel: string,
  selector: Selector,
  value: unknown,
  node?: BabelTypes.Node,
) {
  const values = Array.isArray(value) ? value : [value];

  for (const item of values) {
    validateSelectorItem(fnLabel, selector, String(item ?? ''), node);
  }
}

export function getCompilerCheckSelectorMode(
  value: CheckSelectorMode | undefined,
): CheckSelectorMode {
  return value ?? true;
}

export function validateResolvedSelectorValue(
  mode: CheckSelectorMode | undefined,
  fnLabel: string,
  selector: Selector,
  result: EvalResult,
  node?: BabelTypes.Node,
) {
  const resolvedMode = getCompilerCheckSelectorMode(mode);

  if (resolvedMode === false) return;

  if (!result.ok) {
    if (resolvedMode === 'force') {
      throw createSelectorCompileError(
        formatSelectorError(
          fnLabel,
          null,
          'Selector argument must be statically analyzable.',
        ),
        node,
      );
    }

    return;
  }

  validateSelectorValue(fnLabel, selector, result.value, node);
}

export function getSelectorCompileErrorNode(error: unknown) {
  return (error as SelectorCompileError | null)?.[SELECTOR_ERROR_NODE] ?? null;
}

export function validateSelectorDefinition(
  mode: CheckSelectorMode | undefined,
  fnLabel: string,
  selector: Selector,
  node?: BabelTypes.Node | null,
) {
  const resolvedMode = getCompilerCheckSelectorMode(mode);

  if (resolvedMode === false) return;

  const selectorText = selector.selector.trim();
  if (!selectorText || selectorText === SELECTOR_MERGE) return;
  if (selectorText.startsWith(SELECTOR_AT_RULE)) return;
  if (selector.assert === 'attr' || selector.assert === 'tag') return;

  const probe = selector.assert === 'value' ? '1' : '.x';
  const expanded = selectorText
    .split(SELECTOR_ARGS).join(probe)
    .split(SELECTOR_ARG).join(probe);

  let message: string | null = null;

  try {
    assertLocalSelector(expanded);
  } catch (error) {
    if (typeof error === 'string' && error.trim()) {
      message = error;
    } else if (typeof error === 'object' && error && error instanceof Error) {
      message = (error.message || '').trim();
    } else {
      message = 'selector definition is invalid: ' + selectorText;
    }
  }

  if (!message) return;

  throw createSelectorCompileError(
    formatSelectorDefinitionError(fnLabel, selectorText, normalizeSelectorMessage(message)),
    node,
  );
}

function validateSelectorItem(
  fnLabel: string,
  selector: Selector,
  value: string,
  node?: BabelTypes.Node,
) {
  let message: string | null = null;

  try {
    assertSelector(selector.assert, value);
  } catch (error) {
    if (typeof error === 'string' && error.trim()) {
      message = error;
    } else if (typeof error === 'object' && error && error instanceof Error) {
      message = (error.message || '').trim();
    } else {
      message = 'selector is invalid: ' + value;
    }
  }

  if (!message) return;

  throw createSelectorCompileError(
    formatSelectorError(fnLabel, value, normalizeSelectorMessage(message)),
    node,
  );
}

function createSelectorCompileError(
  message: string,
  node: BabelTypes.Node | null | undefined,
) {
  const error = new Error(message) as SelectorCompileError;
  if (node) error[SELECTOR_ERROR_NODE] = node;
  return error;
}

function formatSelectorError(
  fnLabel: string,
  value: string | null,
  message: string,
) {
  const call = value === null
    ? `${fnLabel}(...)`
    : `${fnLabel}(${JSON.stringify(value)})`;

  return [
    'Invalid selector',
    '',
    call,
    message,
  ].join('\n');
}

function formatSelectorDefinitionError(
  fnLabel: string,
  selector: string,
  message: string,
) {
  return [
    'Invalid selector definition',
    '',
    `${fnLabel}: ${JSON.stringify(selector)}`,
    message,
  ].join('\n');
}

function normalizeSelectorMessage(message: string) {
  if (!message) return 'Selector is invalid.';

  const normalized = message.charAt(0).toUpperCase() + message.slice(1);
  return /[.!?]$/.test(normalized) ? normalized : normalized + '.';
}
