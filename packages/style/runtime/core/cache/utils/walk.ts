export function walkRecursiveItems(
  root: unknown,
  fn: (item: unknown) => void,
) {
  if (!root) return;

  const stack: unknown[] = [root];

  while (stack.length > 0) {
    const item = stack.pop();

    if (!item) continue;

    if (Array.isArray(item)) {
      for (let i = item.length - 1; i >= 0; i--) {
        stack.push(item[i]);
      }

      continue;
    }

    fn(item);
  }
}
