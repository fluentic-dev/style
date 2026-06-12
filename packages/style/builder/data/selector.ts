import { assertSelector } from '../../selector';
import type { Selector } from '../../selector';
import { traceError } from '../../utils/trace';

export const SELECTOR_BASE = '';
export const SELECTOR_ARG = '$';
export const SELECTOR_ARGS = '$$';
export const SELECTOR_MERGE = '...';
export const SELECTOR_AT_RULE = '@';
export const SELECTOR_MEDIA = '@media';
export const SELECTOR_CONTAINER = '@container';

export function normalizeSelectorArg(arg: string) {
  return arg.includes('\n') ? arg.replace(/\n/g, '') : arg;
}

export function checkSelector(
  fnPrefix: string,
  fnName: string,
  fnSelector: Selector,
  arg: string,
) {
  let message: string | null = null;

  try {
    assertSelector(fnSelector.assert, arg);
  } catch (error) {
    if (typeof error === 'string' && error.trim()) {
      message = error;
    } else if (typeof error === 'object' && error && error instanceof Error) {
      message = (error.message || '').trim();
    } else {
      message = 'selector is invalid: ' + arg;
    }
  }

  if (!message) return;

  const error = `${fnPrefix}${fnName}(${arg || ''}): ${message}`;

  throw traceError(error);
}
