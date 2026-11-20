import { symbol } from '../utils/symbol';

const STYLE_IMPORTANT: unique symbol = symbol('style.important');

export type StyleImportantValue<T = unknown> = {
  readonly [STYLE_IMPORTANT]: true;
  readonly value: T;
  readonly native?: boolean;
};

export function importantValue<T>(value: T, native = false): StyleImportantValue<T> {
  return {
    [STYLE_IMPORTANT]: true,
    value,
    native,
  };
}

export function isStyleImportantValue(value: unknown): value is StyleImportantValue {
  return !!value && typeof value === 'object' && (value as StyleImportantValue)[STYLE_IMPORTANT] === true;
}
