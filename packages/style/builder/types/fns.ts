import type { Selector } from '../../selector';
import type { StyleObject } from '../../style/types';
import type { ScopeItems } from '../data/merge/scope';
import type { scopeRule, slotOverrideRule, slotRule, styleRule } from './alias';
import type { AtRuleStyleData, MergeRuleStyleData } from './types';

/* style */

type StyleFn<Style, Self> = {
  (style: StyleObject<Style>): Self;
};

type StyleArgFn<Style, Self, Arg extends string> = {
  (selector: Arg, style: StyleObject<Style>): Self;
};

type StyleArgsFn<Style, Self, Arg extends string> = {
  (selector: Arg | Arg[], style: StyleObject<Style>): Self;
};

type StyleMergeFn<Style, Self> = {
  (style: MergeRuleStyleData<Style>): Self;
};

type StyleAtRuleFn<Style, Self, Arg> = {
  (selector: Arg, style: AtRuleStyleData<Style>): Self;
};

type StyleAtRuleNoArgFn<Style, Self> = {
  (style: AtRuleStyleData<Style>): Self;
};

type StyleMediaFn<Style, Self, Arg> = StyleAtRuleFn<Style, Self, Arg> & {
  (priority: number, selector: Arg, style: AtRuleStyleData<Style>): Self;
};

type StyleMediaNoArgFn<Style, Self> = StyleAtRuleNoArgFn<Style, Self> & {
  (priority: number, style: AtRuleStyleData<Style>): Self;
};

type StyleAtRuleArgFn<Style, Self, Arg extends string> = StyleAtRuleFn<Style, Self, Arg>;
type StyleAtRuleArgsFn<Style, Self, Arg extends string> = StyleAtRuleFn<Style, Self, Arg | Arg[]>;

type StyleMediaArgFn<Style, Self, Arg extends string> = StyleMediaFn<Style, Self, Arg>;
type StyleMediaArgsFn<Style, Self, Arg extends string> = StyleMediaFn<Style, Self, Arg | Arg[]>;

export type SelectorString<S> = S extends Selector<infer T, any> ? T : S;
export type SelectorArg<S> = S extends Selector<any, infer Arg> ? Arg : string;

type GetArgFn<
  Selector,
  Fns extends Record<'Args' | 'Arg' | 'Default', unknown>,
> = Selector extends `${string}$$${string}` ? Fns['Args']
  : Selector extends `${string}$${string}` ? Fns['Arg']
  : Fns['Default'];

export type GetSelectorFn<
  Selector,
  Fns extends Record<
    'MediaNoArg' | 'MediaArg' | 'MediaArgs' | 'AtRuleNoArg' | 'AtRuleArg' | 'AtRuleArgs' | 'Args' | 'Arg' | 'Default',
    unknown
  >,
> = Selector extends `@media${string}` | `@container${string}` ? GetArgFn<Selector, {
    Args: Fns['MediaArgs'];
    Arg: Fns['MediaArg'];
    Default: Fns['MediaNoArg'];
  }>
  : Selector extends `@${string}` //
    ? GetArgFn<Selector, {
      Args: Fns['AtRuleArgs'];
      Arg: Fns['AtRuleArg'];
      Default: Fns['AtRuleNoArg'];
    }>
  : GetArgFn<Selector, {
    Args: Fns['Args'];
    Arg: Fns['Arg'];
    Default: Fns['Default'];
  }>;

type GetStyleFn<Selector, Style, Self> = SelectorString<Selector> extends '...' ? StyleMergeFn<Style, Self>
  : GetSelectorFn<SelectorString<Selector>, {
    MediaNoArg: StyleMediaNoArgFn<Style, Self>;
    MediaArgs: StyleMediaArgsFn<Style, Self, SelectorArg<Selector>>;
    MediaArg: StyleMediaArgFn<Style, Self, SelectorArg<Selector>>;
    AtRuleNoArg: StyleAtRuleNoArgFn<Style, Self>;
    AtRuleArgs: StyleAtRuleArgsFn<Style, Self, SelectorArg<Selector>>;
    AtRuleArg: StyleAtRuleArgFn<Style, Self, SelectorArg<Selector>>;
    Args: StyleArgsFn<Style, Self, SelectorArg<Selector>>;
    Arg: StyleArgFn<Style, Self, SelectorArg<Selector>>;
    Default: StyleFn<Style, Self>;
  }>;

/* scope */

type ScopeFn<Style, Result> = {
  (styles: Style): Result;
};

type ScopeArgFn<Style, Result, Arg extends string> = {
  (selector: Arg, styles: Style): Result;
};

type ScopeArgsFn<Style, Result, Arg extends string> = {
  (selector: Arg | Arg[], styles: Style): Result;
};

type ScopeAtRuleFn<Style, Result, Arg> = {
  (selector: Arg, styles: Style): Result;
};

type ScopeAtRuleNoArgFn<Style, Result> = {
  (styles: Style): Result;
};

type ScopeMediaFn<Style, Result, Arg> = ScopeAtRuleFn<Style, Result, Arg> & {
  (priority: number, selector: Arg, styles: Style): Result;
};

type ScopeMediaNoArgFn<Style, Result> = ScopeAtRuleNoArgFn<Style, Result> & {
  (priority: number, styles: Style): Result;
};

type ScopeAtRuleArgFn<Style, Result, Arg extends string> = ScopeAtRuleFn<Style, Result, Arg>;
type ScopeAtRuleArgsFn<Style, Result, Arg extends string> = ScopeAtRuleFn<Style, Result, Arg | Arg[]>;

type ScopeMediaArgFn<Style, Result, Arg extends string> = ScopeMediaFn<Style, Result, Arg>;
type ScopeMediaArgsFn<Style, Result, Arg extends string> = ScopeMediaFn<Style, Result, Arg | Arg[]>;

type GetScopeFn<Selector, Style, Result> = GetSelectorFn<SelectorString<Selector>, {
  MediaNoArg: ScopeMediaNoArgFn<Style, Result>;
  MediaArgs: ScopeMediaArgsFn<Style, Result, SelectorArg<Selector>>;
  MediaArg: ScopeMediaArgFn<Style, Result, SelectorArg<Selector>>;
  AtRuleNoArg: ScopeAtRuleNoArgFn<Style, Result>;
  AtRuleArgs: ScopeAtRuleArgsFn<Style, Result, SelectorArg<Selector>>;
  AtRuleArg: ScopeAtRuleArgFn<Style, Result, SelectorArg<Selector>>;
  Args: ScopeArgsFn<Style, Result, SelectorArg<Selector>>;
  Arg: ScopeArgFn<Style, Result, SelectorArg<Selector>>;
  Default: ScopeFn<Style, Result>;
}>;

/* selector fns */

export type StyleSelfFn<Style, Selectors> = (
  style?: StyleObject<Style>,
) => ReturnType<typeof styleRule<Style, Selectors>>;

export type SlotSelfFn<Style, Selectors> = (
  style?: StyleObject<Style>,
) => ReturnType<typeof slotRule<Style, Selectors>>;

export type ScopeSelfFn<Selectors> = (
  styles?: ScopeItems,
) => ReturnType<typeof scopeRule<Selectors>>;

export type StyleSelectorFns<Style, Selectors> = {
  [P in keyof Selectors]: GetStyleFn<
    Selectors[P],
    Style,
    ReturnType<typeof styleRule<Style, Selectors>>
  >;
};

export type SlotSelectorFns<Style, Selectors> = {
  [P in keyof Selectors]: GetStyleFn<
    Selectors[P],
    Style,
    ReturnType<typeof slotRule<Style, Selectors>>
  >;
};

export type SlotOverrideSelectorFns<Style, Selectors> = {
  [P in keyof Selectors]: GetStyleFn<
    Selectors[P],
    Style,
    ReturnType<typeof slotOverrideRule<Style, Selectors>>
  >;
};

export type ScopeSelectorFns<Selectors> = {
  [P in keyof Selectors]: GetScopeFn<
    Selectors[P],
    ScopeItems,
    ReturnType<typeof scopeRule<Selectors>>
  >;
};
