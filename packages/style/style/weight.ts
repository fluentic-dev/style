import { symbol } from '../utils/symbol';

const STYLE_WEIGHT: unique symbol = symbol('style.weight');

export type StyleWeightValue<T = unknown> = {
  readonly [STYLE_WEIGHT]: true;
  readonly value: T;
  readonly weight: number;
};

export function weightValue<T>(value: T, weight: number): StyleWeightValue<T> {
  return {
    [STYLE_WEIGHT]: true,
    value,
    weight,
  };
}

export function isStyleWeightValue(value: unknown): value is StyleWeightValue {
  return !!value && typeof value === 'object' && (value as StyleWeightValue)[STYLE_WEIGHT] === true;
}
