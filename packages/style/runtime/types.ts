import type { CSSProperties } from 'react';
import type { ScopeData, ScopeTargetData, SlotData, StyleData, ThemeData } from '../builder/data';
import type { StyleTokenData, StyleTokenOverride } from '../style';
import type { ResolvedStyleItem } from './core/cache/item';

export type Falsy = false | null | undefined;

export type RecursiveProp<Item> =
  | Item
  | Falsy
  | readonly RecursiveProp<Item>[];

export type StyleItem = ScopeTargetData | StyleTokenOverride<any>;

export type StyleItems = (StyleItem | Falsy)[];

export type RuntimeStyleItem = ResolvedStyleItem | ThemeData;

export type RuntimeStylePropItem = RuntimeStyleItem | StyleData | SlotData;

export type StyleProp = RecursiveProp<RuntimeStylePropItem>;

export type StyleTokenInput<T> = T | StyleTokenData<T>;

export type StyleTheme = RecursiveProp<ScopeData>;

export type TokenTheme = ThemeData;

export type RuntimeStyleAttributes = {
  css?: StyleProp;
};

export type ElementDebugData = {
  $$elementDebug: true;
  loc: [line: number, column: number];
  label: string;
  sourceUrl: string;
  code?: string;
};

export type DomElementProps = {
  className?: string;
  style?: CSSProperties;
};
