import type { CSSProperties as CSSPropertiesRaw } from 'react';
import type { StyleTokenData } from './token';

type CSSValueExclude = '-moz-initial';

export type CSSProperties = {
  [P in keyof CSSPropertiesRaw]: Exclude<CSSPropertiesRaw[P], CSSValueExclude>;
};

// StyleTokenize<string | number> -> StyleTokenData<string> | StyleTokenData<number>
type StyleTokenize<T> = Exclude<
  T extends unknown ? StyleTokenData<T> : never,
  StyleTokenData<undefined>
>;

type Value<T> = T | StyleValueTuple<Exclude<T, null | undefined>>;
type PlainValue<T> = T | StyleValueTuple<Exclude<T, null | undefined>>;

export type StyleValueTuple<T = unknown> = [priority: number, value: T];

export type StyleValue<T> = Value<T | StyleTokenize<T>>;

export type StyleObject<T = unknown> = {
  [P in keyof T]: StyleValue<T[P]>;
};

export type PlainStyleObject<T = unknown> = {
  [P in keyof T]: PlainValue<T[P]>;
};
