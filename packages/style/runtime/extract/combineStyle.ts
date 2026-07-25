import type { SheetData, SlotData, StyleData } from '../../builder/data';
import { isSheetData, isSlotData, isStyleData } from '../../builder/data';
import { type CombinedStyleArg, createCombinedStyleGetter } from '../core/cache/combine';
import type { CombinedStyle } from '../core/combinedStyle';
import type { StyleProp } from '../types';
import { extractedTokenValueResolver } from './tokenResolver';

export type StyleCombiner<T extends object> = (
  ...args: CombinedStyleArg<T>[]
) => CombinedStyle<T>;

export type CombinedStyleFor<T extends object | StyleCombiner<any>> = CombinedStyleArg<InferStyleCombinerStyles<T>>;

type InferStyleCombinerStyles<T extends object | StyleCombiner<any>> = T extends StyleCombiner<infer Styles> ? Styles
  : T extends object ? T
  : never;

type SingleStyleItem = StyleData | SheetData | SlotData;

type CombineStyleFn = <T extends object>(
  styles: T,
  ...args: CombinedStyleArg<T>[]
) => CombinedStyle<T>;

type StyleWithCombiner = {
  (style: SingleStyleItem): StyleProp;
  <T extends object>(styles: T): CombinedStyle<T>;
};

type CombineStyle = CombineStyleFn & {
  for<T extends object>(styles: T): StyleCombiner<T>;
  with(...args: CombinedStyleArg<any>[]): StyleWithCombiner;
  multi<T extends readonly SingleStyleItem[]>(
    styles: T,
    ...args: CombinedStyleArg<any>[]
  ): { [P in keyof T]: StyleProp; };
};

type StyleWithArgs = {
  combineArgs: CombinedStyleArg<any>[];
  styles: SingleStyleItem[];
};

const singleStyleWrappers = new WeakMap<SingleStyleItem, { value: SingleStyleItem; }>();

const combineStyleBase = <T extends object>(
  styles: T,
  ...args: CombinedStyleArg<T>[]
): CombinedStyle<T> => getExtractedCombinedStyle(styles, args);

const combineStyleFor = <T extends object>(styles: T): StyleCombiner<T> => {
  return (...args: CombinedStyleArg<T>[]) => combineStyleBase(styles, ...args);
};

const combineStyleWith = (...args: CombinedStyleArg<any>[]): StyleWithCombiner => {
  const withArgs = collectStyleWithArgs(args);

  return ((styles: object) => {
    return isSingleStyleItem(styles)
      ? combineStyleSingle(styles, withArgs)
      : combineStyleBase(styles, ...withArgs.combineArgs);
  }) as StyleWithCombiner;
};

const combineStyleMulti = <T extends readonly SingleStyleItem[]>(
  styles: T,
  ...args: CombinedStyleArg<any>[]
): { [P in keyof T]: StyleProp; } => {
  const withArgs = collectStyleWithArgs(args);

  return styles.map((style) => combineStyleSingle(style, withArgs)) as { [P in keyof T]: StyleProp; };
};

function combineStyleSingle(
  style: SingleStyleItem,
  args: StyleWithArgs,
): StyleProp {
  const result = combineStyleSingleItem(style, args.combineArgs);

  if (!args.styles.length) return result;

  const styles: StyleProp[] = [result];

  for (let i = 0, len = args.styles.length; i < len; i++) {
    styles.push(combineStyleSingleItem(args.styles[i], args.combineArgs));
  }

  return styles;
}

function combineStyleSingleItem(
  style: SingleStyleItem,
  args: readonly CombinedStyleArg<any>[],
): StyleProp {
  const wrapper = getSingleStyleWrapper(style);

  return combineStyleBase<{ value: SingleStyleItem; }>(
    wrapper,
    ...(args as CombinedStyleArg<{ value: SingleStyleItem; }>[]),
  ).value as StyleProp;
}

function getSingleStyleWrapper(style: SingleStyleItem) {
  let wrapper = singleStyleWrappers.get(style);

  if (!wrapper) {
    wrapper = { value: style };
    singleStyleWrappers.set(style, wrapper);
  }

  return wrapper;
}

function isSingleStyleItem(value: object): value is SingleStyleItem {
  return isStyleData(value) || isSheetData(value) || isSlotData(value);
}

function collectStyleWithArgs(args: readonly CombinedStyleArg<any>[]) {
  const result: StyleWithArgs = {
    combineArgs: [],
    styles: [],
  };

  collectArgs(args, result);

  return result;
}

function collectArgs(
  args: readonly CombinedStyleArg<any>[],
  result: StyleWithArgs,
) {
  for (let i = 0, len = args.length; i < len; i++) {
    const arg = args[i];

    if (!arg) continue;

    if (Array.isArray(arg)) {
      collectArgs(arg, result);
      continue;
    }

    result.combineArgs.push(arg);

    if (isSingleStyleItem(arg)) {
      result.styles.push(arg);
    }
  }
}

export const combineStyle = Object.assign(combineStyleBase, {
  for: combineStyleFor,
  with: combineStyleWith,
  multi: combineStyleMulti,
}) as CombineStyle;

const getExtractedCombinedStyle = createCombinedStyleGetter(extractedTokenValueResolver);
