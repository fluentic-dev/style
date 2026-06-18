export declare const SelectorAssertArgSymbol: unique symbol;

export type Selector<T extends string = string, Arg extends string = string> = {
  selector: T;
  priority: number | null;
  assert: SelectorType | SelectorAssertFn<Arg> | null;
};

export type SelectorAssert<Arg extends string = string> = SelectorType | SelectorAssertFn<Arg>;

export type SelectorAssertFn<Arg extends string = string> = {
  (arg: string): void;
  readonly [SelectorAssertArgSymbol]?: Arg;
};

export type SelectorType =
  | 'local'
  | 'arg'
  | 'tag'
  | 'attr'
  | 'value'
  | 'media'
  | 'supports'
  | 'container';
