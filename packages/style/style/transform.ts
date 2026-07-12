import { symbol } from '../utils/symbol';
import type { CSSProperties, StyleObject, StyleValue } from './types';

const CLASS_NAME_VALUE: unique symbol = symbol('transform.classNameValue');

export type ClassNameValue<Value = unknown> = {
  readonly [CLASS_NAME_VALUE]: true;
  readonly value: Value;
  readonly className: string;
};

export type TransformStyleObject<Style = unknown> = {
  [P in keyof Style]: StyleValue<Style[P] | ClassNameValue<Style[P]>>;
};

export type StyleTransform<Style = unknown> = {
  transform(style: StyleObject<Style>): TransformStyleObject<CSSProperties>;
};

export type ClassNameTransform<ClassName extends string = string> = {
  transform(className: ClassName): TransformStyleObject<CSSProperties>;
};

export function classNameValue<const Value>(
  value: Value,
  className: string,
): ClassNameValue<Value> {
  return {
    [CLASS_NAME_VALUE]: true,
    value,
    className,
  };
}

export function isClassNameValue(value: unknown): value is ClassNameValue {
  return !!value &&
    typeof value === 'object' &&
    (value as ClassNameValue)[CLASS_NAME_VALUE] === true &&
    typeof (value as ClassNameValue).className === 'string';
}

export function styleTransform<Style>(options: StyleTransform<Style>) {
  return options;
}

export function classNameTransform<ClassName extends string>(options: ClassNameTransform<ClassName>) {
  return options;
}
