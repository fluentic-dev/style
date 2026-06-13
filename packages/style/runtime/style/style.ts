import {
  getCombinedStyle,
  type CombinedStyleArg as CoreCombinedStyleArg,
} from '../core/cache/combine';
import type { CombinedStyle } from '../core/combinedStyle';

export type CombineStyleArg<T extends object> = CoreCombinedStyleArg<T>;

type CombineStyleFn = <T extends object>(
  styles: T,
  ...args: CombineStyleArg<T>[]
) => CombinedStyle<T>;

type CombineStyle = CombineStyleFn & {
  for<T extends object>(styles: T): (...args: CombineStyleArg<T>[]) => CombinedStyle<T>;
};

const combineStyleBase = <T extends object>(
  styles: T,
  ...args: CombineStyleArg<T>[]
): CombinedStyle<T> => getCombinedStyle(styles, args);

const combineStyleFor = <T extends object>(styles: T) => {
  return (...args: CombineStyleArg<T>[]) => combineStyleBase(styles, ...args);
};

export const combineStyle = Object.assign(combineStyleBase, {
  for: combineStyleFor,
}) as CombineStyle;
