import type { Selector, SelectorAssert, SelectorAssertFn } from './types';

type SelectorArgs =
  | []
  | [SelectorAssert | null]
  | [number]
  | [number, SelectorAssert | null];

type SelectorAssertArg<Assert> = Assert extends SelectorAssertFn<infer Arg> ? Arg extends string ? Arg : string
  : string;

type SelectorArg<Args extends SelectorArgs> = Args extends [infer Assert] ? SelectorAssertArg<Assert>
  : Args extends [number, infer Assert] ? SelectorAssertArg<Assert>
  : string;

export function selector<const T extends string, const Args extends SelectorArgs>(
  selector: T,
  ...args: Args
) {
  let priority: number | null = null;
  let assert: SelectorAssert | null = null;

  if (typeof args[0] === 'number') {
    priority = args[0];
    assert = args[1] || null;
  } else {
    assert = args[0] || null;
  }

  return { selector, priority, assert } as Selector<T, SelectorArg<Args>>;
}

type SelectorString<T extends Selector> = T extends Selector<infer T> ? T : unknown;

type PrioritySelectors<Selectors extends Record<string, Selector>> = {
  [P in keyof Selectors as SelectorString<Selectors[P]> extends `@${string}` | `${string}...${string}` ? never : P]:
    Selectors[P];
};

export function selectorPriority<Selectors extends Record<string, Selector>>(
  selectors: Selectors,
  values: (keyof PrioritySelectors<Selectors>)[] | PrioritySelectors<Selectors>,
) {
  selectors = { ...selectors };

  type Key = keyof PrioritySelectors<Selectors>;

  const items = Array.isArray(values)
    ? values.map((name, index) => ({
      name: name as Key,
      priority: index + 1,
    }))
    : Object.keys(values).map((name) => ({
      name: name as Key,
      priority: values[name as Key]?.priority ?? null,
    }));

  items.forEach(({ name, priority }) => {
    if (!selectors[name]) return;

    selectors[name] = {
      ...selectors[name],
      priority: priority ?? selectors[name].priority,
    };
  });

  return selectors;
}
