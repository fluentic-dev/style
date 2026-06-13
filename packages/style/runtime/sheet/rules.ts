import { isThemeData, type ThemeData } from '../../builder/data';
import type { SheetRule } from '../../sheet';
import { getCssPropItems, type CssPropItem, walkCssProp } from '../core/cache/prop';
import type { CssProp } from '../types';
import { createRuntimeSheetRule, type RuntimeSheetRule } from './rule';

export function walkCssPropSheetRules(
  css: CssProp,
  onRule: (rule: RuntimeSheetRule) => void,
  onTheme?: (theme: ThemeData) => void,
) {
  walkCssProp(css, (item) => {
    walkCssPropItemSheetRules(item, onRule, onTheme);
  });
}

export function walkCssPropItemsSheetRules(
  items: readonly CssPropItem[],
  onRule: (rule: RuntimeSheetRule) => void,
  onTheme?: (theme: ThemeData) => void,
) {
  for (let i = 0, len = items.length; i < len; i++) {
    walkCssPropItemSheetRules(items[i], onRule, onTheme);
  }
}

function walkCssPropItemSheetRules(
  item: CssPropItem,
  onRule: (rule: RuntimeSheetRule) => void,
  onTheme?: (theme: ThemeData) => void,
) {
  if (isThemeData(item)) {
    onTheme?.(item);
    return;
  }

  const items = getCssPropItems(item);

  for (let i = 0, len = items.length; i < len; i++) {
    const rule = createRuntimeSheetRule(items[i]);
    if (rule) onRule(rule);
  }
}

export function collectCssPropSheetRules(css: CssProp): SheetRule[] {
  return collectCssPropRules((onRule) => {
    walkCssPropSheetRules(css, onRule);
  });
}

export function collectCssPropItemsSheetRules(
  items: readonly CssPropItem[],
): SheetRule[] {
  return collectCssPropRules((onRule) => {
    walkCssPropItemsSheetRules(items, onRule);
  });
}

function collectCssPropRules(
  walk: (onRule: (rule: RuntimeSheetRule) => void) => void,
) {
  const rules: SheetRule[] = [];
  const lookup = new Map<string, number>();

  walk((rule) => {
    if (!rule.key || !rule.dedupe) return;

    const payload: SheetRule = {
      key: rule.key,
      css: rule.css,
      callsite: rule.callsite || null,
      priority: rule.priority,
    };

    const index = lookup.get(rule.dedupe);

    if (index === undefined) {
      lookup.set(rule.dedupe, rules.push(payload) - 1);
    } else {
      rules[index] = payload;
    }
  });

  return rules;
}
