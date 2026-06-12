export declare const UniqueSymbol: unique symbol;

export type RecursiveArray<T> = readonly (T | RecursiveArray<T>)[];
export type MaybeArray<T> = T | readonly T[];

export type Collapse = {
  readonly [UniqueSymbol]?: never;
};

export type Type<T> = (type?: T) => null;

export function type<T>(_?: T) {
  return null;
}

export function constant<const T>(data: T) {
  return data;
}
