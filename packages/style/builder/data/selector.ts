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
