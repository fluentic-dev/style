import { type CombinedStyleArg, getCombinedStyle } from '../core/cache/combine';
import type { CombinedStyle } from '../core/combinedStyle';

export type StyleCombiner<T extends object> = (
  ...args: CombinedStyleArg<T>[]
) => CombinedStyle<T>;

export type CombinedStyleFor<T extends object | StyleCombiner<any>> = CombinedStyleArg<InferStyleCombinerStyles<T>>;

type InferStyleCombinerStyles<T extends object | StyleCombiner<any>> = T extends StyleCombiner<infer Styles> ? Styles
  : T extends object ? T
  : never;

type CombineStyleFn = <T extends object>(
  styles: T,
  ...args: CombinedStyleArg<T>[]
) => CombinedStyle<T>;

type CombineStyle = CombineStyleFn & {
  for<T extends object>(styles: T): StyleCombiner<T>;
};

const combineStyleBase = <T extends object>(
  styles: T,
  ...args: CombinedStyleArg<T>[]
): CombinedStyle<T> => getCombinedStyle(styles, args);

const combineStyleFor = <T extends object>(styles: T): StyleCombiner<T> => {
  return (...args: CombinedStyleArg<T>[]) => combineStyleBase(styles, ...args);
};

export const combineStyle = Object.assign(combineStyleBase, {
  for: combineStyleFor,
}) as CombineStyle;
