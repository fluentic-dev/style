import type { ThemeData } from '../../builder/data/data';
import { BUILDER_CALLSITE } from '../../builder/data/const';
import { isThemeData } from '../../builder/data/is';
import type { SheetRule } from '../../sheet';
import { getStylePropItems, type StylePropItem, walkStyleProp } from '../core/cache/prop';
import type { StyleProp } from '../types';
import { createRuntimeSheetRule, type RuntimeSheetRule } from './rule';
import { createThemeRule } from './theme';

export function walkStylePropSheetRules(
  styleProp: StyleProp,
  onRule: (rule: RuntimeSheetRule) => void,
  onTheme?: (theme: ThemeData) => void,
) {
  walkStyleProp(styleProp, (item) => {
    walkStylePropItemSheetRules(item, onRule, onTheme);
  });
}

export function walkStylePropItemsSheetRules(
  items: readonly StylePropItem[],
  onRule: (rule: RuntimeSheetRule) => void,
  onTheme?: (theme: ThemeData) => void,
) {
  for (let i = 0, len = items.length; i < len; i++) {
    walkStylePropItemSheetRules(items[i], onRule, onTheme);
  }
}

function walkStylePropItemSheetRules(
  item: StylePropItem,
  onRule: (rule: RuntimeSheetRule) => void,
  onTheme?: (theme: ThemeData) => void,
) {
  if (isThemeData(item)) {
    onTheme?.(item);
    return;
  }

  const items = getStylePropItems(item);

  for (let i = 0, len = items.length; i < len; i++) {
    const rule = createRuntimeSheetRule(items[i]);
    if (rule) onRule(rule);
  }
}

export function collectStylePropSheetRules(styleProp: StyleProp): SheetRule[] {
  return collectStylePropRules((onRule) => {
    walkStylePropSheetRules(styleProp, onRule);
  });
}

export function collectStylePropItemsSheetRules(
  items: readonly StylePropItem[],
): SheetRule[] {
  return collectStylePropRules((onRule) => {
    walkStylePropItemsSheetRules(items, onRule);
  });
}

export function collectStylePropItemsSheetRulesWithThemes(
  items: readonly StylePropItem[],
): SheetRule[] {
  const rules: SheetRule[] = [];
  const lookup = new Map<string, number>();

  const addRule = (rule: SheetRule, dedupe: string) => {
    const index = lookup.get(dedupe);

    if (index === undefined) {
      lookup.set(dedupe, rules.push(rule) - 1);
    } else {
      rules[index] = rule;
    }
  };

  walkStylePropItemsSheetRules(
    items,
    (rule) => {
      if (!rule.key || !rule.dedupe) return;

      addRule(createSheetRulePayload(rule), rule.dedupe);
    },
    (theme) => {
      addRule({
        key: theme.className,
        css: createThemeRule(theme),
        callsite: theme[BUILDER_CALLSITE],
      }, theme.className);
    },
  );

  return rules;
}

function collectStylePropRules(
  walk: (onRule: (rule: RuntimeSheetRule) => void) => void,
) {
  const rules: SheetRule[] = [];
  const lookup = new Map<string, number>();

  walk((rule) => {
    if (!rule.key || !rule.dedupe) return;

    const index = lookup.get(rule.dedupe);

    if (index === undefined) {
      lookup.set(rule.dedupe, rules.push(createSheetRulePayload(rule)) - 1);
    } else {
      rules[index] = createSheetRulePayload(rule);
    }
  });

  return rules;
}

function createSheetRulePayload(rule: RuntimeSheetRule): SheetRule {
  return {
    key: rule.key,
    css: rule.css,
    callsite: rule.callsite || null,
    debug: rule.debug || null,
    debugField: rule.debugField || null,
    priority: rule.priority,
  };
}
