import type { CssExtractRule } from './types';

export type CompilerCssCollector = ReturnType<typeof createCssCollector>;

export function createCssCollector() {
  let items: CssExtractRule[] = [];

  return {
    add(item: CssExtractRule) {
      items.push(item);
    },

    addMany(items: CssExtractRule[]) {
      items.push(...items);
    },

    getItems() {
      return items;
    },

    clear() {
      items = [];
    },
  };
}
