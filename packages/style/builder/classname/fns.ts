import type { Collapse } from '../../utils/type';
import type { GetSelectorFn, SelectorArg, SelectorString } from '../types/fns';
import type { ClassNameBuilder, ClassNameItem, ClassNameMergeData } from './types';

type ClassNameItems<ClassName extends string> = readonly ClassNameItem<ClassName>[];

type ClassNameFn<ClassName extends string, Self> = {
  (...items: ClassNameItems<ClassName>): Self;
};

type ClassNameArgFn<ClassName extends string, Self, Arg extends string> = {
  (selector: Arg, ...items: ClassNameItems<ClassName>): Self;
};

type ClassNameArgsFn<ClassName extends string, Self, Arg extends string> = {
  (selector: Arg | readonly Arg[], ...items: ClassNameItems<ClassName>): Self;
};

type ClassNameMergeFn<ClassName extends string, Self> = {
  (...styles: ClassNameMergeData<ClassName>[]): Self;
};

type ClassNameAtRuleFn<ClassName extends string, Self, Arg> = {
  (selector: Arg, ...items: ClassNameItems<ClassName>): Self;
};

type ClassNameAtRuleNoArgFn<ClassName extends string, Self> = {
  (...items: ClassNameItems<ClassName>): Self;
};

type ClassNameMediaFn<ClassName extends string, Self, Arg> = ClassNameAtRuleFn<ClassName, Self, Arg> & {
  (priority: number, selector: Arg, ...items: ClassNameItems<ClassName>): Self;
};

type ClassNameMediaNoArgFn<ClassName extends string, Self> = ClassNameAtRuleNoArgFn<ClassName, Self> & {
  (priority: number, ...items: ClassNameItems<ClassName>): Self;
};

type ClassNameAtRuleArgFn<ClassName extends string, Self, Arg extends string> = ClassNameAtRuleFn<ClassName, Self, Arg>;
type ClassNameAtRuleArgsFn<ClassName extends string, Self, Arg extends string> = ClassNameAtRuleFn<
  ClassName,
  Self,
  Arg | readonly Arg[]
>;

type ClassNameMediaArgFn<ClassName extends string, Self, Arg extends string> = ClassNameMediaFn<ClassName, Self, Arg>;
type ClassNameMediaArgsFn<ClassName extends string, Self, Arg extends string> = ClassNameMediaFn<
  ClassName,
  Self,
  Arg | readonly Arg[]
>;

type GetClassNameFn<Selector, ClassName extends string, Self> = SelectorString<Selector> extends '...'
  ? ClassNameMergeFn<ClassName, Self>
  : GetSelectorFn<SelectorString<Selector>, {
    MediaNoArg: ClassNameMediaNoArgFn<ClassName, Self>;
    MediaArgs: ClassNameMediaArgsFn<ClassName, Self, SelectorArg<Selector>>;
    MediaArg: ClassNameMediaArgFn<ClassName, Self, SelectorArg<Selector>>;
    AtRuleNoArg: ClassNameAtRuleNoArgFn<ClassName, Self>;
    AtRuleArgs: ClassNameAtRuleArgsFn<ClassName, Self, SelectorArg<Selector>>;
    AtRuleArg: ClassNameAtRuleArgFn<ClassName, Self, SelectorArg<Selector>>;
    Args: ClassNameArgsFn<ClassName, Self, SelectorArg<Selector>>;
    Arg: ClassNameArgFn<ClassName, Self, SelectorArg<Selector>>;
    Default: ClassNameFn<ClassName, Self>;
  }>;

export type ClassNameSelfFn<ClassName extends string, Selectors> = (
  ...items: ClassNameItems<ClassName>
) => ClassNameBuilder<ClassName, Selectors> & Collapse;

export type ClassNameSelectorFns<ClassName extends string, Selectors> = {
  [P in keyof Selectors]: GetClassNameFn<
    Selectors[P],
    ClassName,
    ClassNameBuilder<ClassName, Selectors> & Collapse
  >;
};
