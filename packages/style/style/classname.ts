import { type ClassNameFn, createClassNameBuilder, type WeightedClassName } from '../builder/classname';
import type { SelectorsRecord } from '../builder/types';
import { PrioritySelectors } from '../selector/presets';
import type { Type } from '../utils/type';
import { assignStyleFnMeta } from './style';
import type { ClassNameTransform } from './transform';

export type { ClassNameBuilder, ClassNameFn, ClassNameItem, WeightedClassName } from '../builder/classname';
export type { ClassNameTransform } from './transform';

type InferClassName<Transform> = Transform extends ClassNameTransform<infer ClassName> ? ClassName : never;

export function createClassNameFn<
  const Selectors extends SelectorsRecord = typeof PrioritySelectors,
  const Transform extends ClassNameTransform<any> = ClassNameTransform<string>,
  ClassName extends string = InferClassName<Transform>,
>(args: {
  className?: Type<ClassName>;
  selectors: Selectors;
  transform: Transform;
}) {
  const { selectors, transform } = args;

  const fnClassName = createClassNameBuilder<ClassName, Selectors>(selectors, transform);
  const className = fnClassName as ClassNameFn<ClassName, Selectors>;

  className.weight = (classNameValue, weight): WeightedClassName<ClassName> => {
    return {
      className: classNameValue,
      weight,
    };
  };

  assignStyleFnMeta(className, {
    mode: 'ClassName',
    selectors,
    transform,
  });

  return { className };
}
