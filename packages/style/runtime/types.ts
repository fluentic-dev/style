import type { CSSProperties } from 'react';
import type { ScopeData, ScopeTargetData, ThemeData } from '../builder/data';
import type { StyleTokenData, StyleTokenOverride } from '../style';
import type { CssInstance, CssResolvedItem, CssResolvedTheme } from './instance';

export type Falsy = false | null | undefined;

export type RecursiveProp<Item> =
  | Item
  | Falsy
  | readonly RecursiveProp<Item>[];

export type StyleItem = ScopeTargetData<any> | StyleTokenOverride<any>;

export type StyleItems = (StyleItem | Falsy)[];

export type CssItem = CssResolvedItem | CssResolvedTheme | ThemeData;

export type CssRuntimeItem = CssItem;

export type CssProp = RecursiveProp<CssRuntimeItem>;

export type CssToken<T> = T | StyleTokenData<T>;

export type CssScopeProp = RecursiveProp<CssInstance>;

export type CssTheme = RecursiveProp<ScopeData<any>>;

export type RuntimeStyleAttributes = {
  css?: CssProp;
  scope?: CssScopeProp;
};

export type DomElementProps = {
  className?: string;
  style?: CSSProperties;
};
