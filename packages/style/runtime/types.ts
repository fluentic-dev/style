import type { CSSProperties } from 'react';
import type { ScopeData, ScopeTargetData, SlotData, StyleData, ThemeData } from '../builder/data';
import type { StyleTokenData, StyleTokenOverride } from '../style';
import type { CssResolvedItem, CssResolvedTheme } from './core';

export type Falsy = false | null | undefined;

export type RecursiveProp<Item> =
  | Item
  | Falsy
  | readonly RecursiveProp<Item>[];

export type StyleItem = ScopeTargetData<any> | StyleTokenOverride<any>;

export type StyleItems = (StyleItem | Falsy)[];

export type CssItem = CssResolvedItem | CssResolvedTheme | ThemeData;

export type CssRuntimeItem = CssItem | StyleData | SlotData;

export type CssProp = RecursiveProp<CssRuntimeItem>;

export type CssToken<T> = T | StyleTokenData<T>;

export type CssTheme = RecursiveProp<ScopeData<any>>;

export type RuntimeStyleAttributes = {
  css?: CssProp;
};

export type DomElementProps = {
  className?: string;
  style?: CSSProperties;
};
