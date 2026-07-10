import type { StyleData } from '../data';
import type { ClassNameSelectorFns, ClassNameSelfFn } from './fns';

export type WeightedClassName<ClassName extends string = string> = {
  readonly className: ClassName;
  readonly weight: number;
};

export type ClassNameItem<ClassName extends string = string> =
  | ClassName
  | false
  | null
  | undefined
  | WeightedClassName<ClassName>
  | readonly ClassNameItem<ClassName>[];

export type ClassNameMergeData<ClassName extends string = string> =
  | ClassNameBuilder<ClassName, any>
  | StyleData
  | readonly (ClassNameBuilder<ClassName, any> | StyleData)[];

export type ClassNameBuilderFns<ClassName extends string, Selectors> =
  & ClassNameSelectorFns<ClassName, Selectors>
  & {};

export type ClassNameBuilder<ClassName extends string, Selectors> =
  & StyleData
  & ClassNameBuilderFns<ClassName, Selectors>;

export type ClassNameFn<ClassName extends string, Selectors> =
  & ClassNameSelfFn<ClassName, Selectors>
  & {
    weight(className: ClassName, weight: number): WeightedClassName<ClassName>;
  };
