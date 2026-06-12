import { useRef } from 'react';
import type { Falsy, RecursiveProp } from '../types';

export function useCssProvider<Item>(...items: RecursiveProp<Item>[]) {
  const currentRef = useRef<Item[]>([]);

  const [flattenItems, isChanged] = getFlattenItems(items, currentRef.current);

  if (isChanged) {
    currentRef.current = flattenItems;
  }

  return currentRef.current;
}

function getFlattenItems<Item>(
  items: RecursiveProp<Item>[],
  currentItems: Item[],
) {
  type StackItem = Item | Falsy | readonly RecursiveProp<Item>[];

  const flatItems: Item[] = [];
  const stack = items as StackItem[];

  let same = true;
  let length = 0;

  stack.reverse();

  while (stack.length > 0) {
    const item = stack.pop();

    if (!item) continue;

    if (Array.isArray(item)) {
      for (let i = item.length - 1; i >= 0; i--) {
        stack.push(item[i]);
      }
      continue;
    }

    length = flatItems.push(item as Item);

    if (same && flatItems[length - 1] !== currentItems[length - 1]) {
      same = false;
    }
  }

  if (same) {
    same = length === currentItems.length;
  }

  return [flatItems, !same] as const;
}
