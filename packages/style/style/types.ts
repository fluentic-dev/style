import type { CSSProperties } from '../atomic/utils/types';
import type { StyleImportantValue } from './important';
import type { StyleTokenData } from './token';
import type { AtRuleRef } from './valueRef';
import type { StyleWeightValue } from './weight';

export type { CSSProperties };

// StyleTokenize<string | number> -> StyleTokenData<string> | StyleTokenData<number>
type StyleTokenize<T> = Exclude<
  T extends unknown ? StyleTokenData<T> : never,
  StyleTokenData<undefined>
>;

type Important<T> = StyleImportantValue<Exclude<T, null | undefined>>;
type Weight<T> = StyleWeightValue<Exclude<T, null | undefined>>;
type Value<T> = T | Weight<T> | Important<T>;
type PlainValue<T> = T | Weight<T> | Important<T>;

export type StyleValue<T> = Value<T | StyleTokenize<T> | AtRuleRef>;

export type AtRuleStyleValue<T> = T | StyleTokenize<T>;

export type StyleObject<T = unknown> = {
  [P in keyof T]: StyleValue<T[P]>;
};

export type AtRuleStyleObject<T = unknown> = {
  [P in keyof T]: AtRuleStyleValue<T[P]>;
};

export type PlainStyleObject<T = unknown> = {
  [P in keyof T]: PlainValue<T[P]>;
};
