export declare const UniqueSymbol: unique symbol;

export type RecursiveArray<T> = readonly (T | RecursiveArray<T>)[];
export type MaybeArray<T> = T | readonly T[];

export type OmitProps<T, K extends keyof T> = Omit<T, K>;

export type ReplaceProps<T, R extends Partial<Record<keyof T, any>>> = Omit<T, keyof R> & R;

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
