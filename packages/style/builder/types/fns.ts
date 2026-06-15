import type { Selector } from '../../selector';
import type { StyleObject } from '../../style/types';
import type { DebugData } from '../data';
import type { ScopeItems } from '../data/merge/scope';
import type { scopeRule, slotOverrideRule, slotRule, styleRule } from './alias';
import type { AtRuleStyleData, MergeRuleStyleData } from './types';

/* style */

type StyleFn<Style, Self> = {
  (style: StyleObject<Style>): Self;
};

type StyleArgFn<Style, Self> = {
  (selector: string, style: StyleObject<Style>): Self;
};

type StyleArgsFn<Style, Self> = {
  (selector: string | string[], style: StyleObject<Style>): Self;
};

type StyleMergeFn<Style, Self> = {
  (style: MergeRuleStyleData<Style>): Self;
};

type StyleAtRuleFn<Style, Self, Arg> = {
  (selector: Arg, style: AtRuleStyleData<Style>): Self;
};

type StyleMediaFn<Style, Self, Arg> = StyleAtRuleFn<Style, Self, Arg> & {
  (priority: number, selector: Arg, style: AtRuleStyleData<Style>): Self;
};

type StyleAtRuleArgFn<Style, Self> = StyleAtRuleFn<Style, Self, string>;
type StyleAtRuleArgsFn<Style, Self> = StyleAtRuleFn<Style, Self, string | string[]>;

type StyleMediaArgFn<Style, Self> = StyleMediaFn<Style, Self, string>;
type StyleMediaArgsFn<Style, Self> = StyleMediaFn<Style, Self, string | string[]>;

type SelectorString<S> = S extends Selector<infer T> ? T : S;

type GetArgFn<
  Selector,
  Fns extends Record<'Args' | 'Arg' | 'Default', unknown>,
> = Selector extends `${string}$$${string}` ? Fns['Args']
  : Selector extends `${string}$${string}` ? Fns['Arg']
  : Fns['Default'];

type GetFn<
  Selector,
  Fns extends Record<'MediaArg' | 'MediaArgs' | 'AtRuleArg' | 'AtRuleArgs' | 'Args' | 'Arg' | 'Default', unknown>,
> = Selector extends `@media${string}` | `@container${string}` ? GetArgFn<Selector, {
    Args: Fns['MediaArgs'];
    Arg: Fns['MediaArg'];
    Default: Fns['AtRuleArg'];
  }>
  : Selector extends `@${string}` //
    ? GetArgFn<Selector, {
      Args: Fns['AtRuleArgs'];
      Arg: Fns['AtRuleArg'];
      Default: Fns['AtRuleArg'];
    }>
  : GetArgFn<Selector, {
    Args: Fns['Args'];
    Arg: Fns['Arg'];
    Default: Fns['Default'];
  }>;

type GetStyleFn<Selector, Style, Self> = SelectorString<Selector> extends '...' ? StyleMergeFn<Style, Self>
  : GetFn<SelectorString<Selector>, {
    MediaArgs: StyleMediaArgsFn<Style, Self>;
    MediaArg: StyleMediaArgFn<Style, Self>;
    AtRuleArgs: StyleAtRuleArgsFn<Style, Self>;
    AtRuleArg: StyleAtRuleArgFn<Style, Self>;
    Args: StyleArgsFn<Style, Self>;
    Arg: StyleArgFn<Style, Self>;
    Default: StyleFn<Style, Self>;
  }>;

/* scope */

type ScopeFn<Style, Result> = {
  (styles: Style): Result;
};

type ScopeArgFn<Style, Result> = {
  (selector: string, styles: Style): Result;
};

type ScopeArgsFn<Style, Result> = {
  (selector: string | string[], styles: Style): Result;
};

type ScopeAtRuleFn<Style, Result, Arg> = {
  (selector: Arg, styles: Style): Result;
};

type ScopeMediaFn<Style, Result, Arg> = ScopeAtRuleFn<Style, Result, Arg> & {
  (priority: number, selector: Arg, styles: Style): Result;
};

type ScopeAtRuleArgFn<Style, Result> = ScopeAtRuleFn<Style, Result, string>;
type ScopeAtRuleArgsFn<Style, Result> = ScopeAtRuleFn<Style, Result, string | string[]>;

type ScopeMediaArgFn<Style, Result> = ScopeMediaFn<Style, Result, string>;
type ScopeMediaArgsFn<Style, Result> = ScopeMediaFn<Style, Result, string | string[]>;

type GetScopeFn<Selector, Style, Result> = GetFn<SelectorString<Selector>, {
  MediaArgs: ScopeMediaArgsFn<Style, Result>;
  MediaArg: ScopeMediaArgFn<Style, Result>;
  AtRuleArgs: ScopeAtRuleArgsFn<Style, Result>;
  AtRuleArg: ScopeAtRuleArgFn<Style, Result>;
  Args: ScopeArgsFn<Style, Result>;
  Arg: ScopeArgFn<Style, Result>;
  Default: ScopeFn<Style, Result>;
}>;

/* selector fns */

export type StyleSelfFn<Style, Selectors> = (
  style?: StyleObject<Style>,
  debug?: DebugData,
) => ReturnType<typeof styleRule<Style, Selectors>>;

export type SlotSelfFn<Style, Selectors> = (
  style?: StyleObject<Style>,
  debug?: DebugData,
) => ReturnType<typeof slotRule<Style, Selectors>>;

export type ScopeSelfFn<Style, Selectors> = (
  styles?: ScopeItems<Style>,
  debug?: DebugData,
) => ReturnType<typeof scopeRule<Style, Selectors>>;

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

export type ScopeSelectorFns<Style, Selectors> = {
  [P in keyof Selectors]: GetScopeFn<
    Selectors[P],
    ScopeItems<Style>,
    ReturnType<typeof scopeRule<Style, Selectors>>
  >;
};
