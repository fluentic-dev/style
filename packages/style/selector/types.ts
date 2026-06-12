export type Selector<T extends string = string> = {
  selector: T;
  priority: number | null;
  assert: SelectorType | SelectorAssertFn | null;
};

export type SelectorAssert = SelectorType | SelectorAssertFn;
export type SelectorAssertFn = (arg: string) => void;

export type SelectorType =
  | 'local'
  | 'arg'
  | 'tag'
  | 'attr'
  | 'value'
  | 'media'
  | 'supports'
  | 'container';
