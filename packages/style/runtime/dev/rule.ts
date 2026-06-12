import type { SheetCallsite, SheetRule } from '../../sheet';
import { collectCssPropItems } from '../instance';
import { createRuntimeSheetRule } from '../sheet/rule';
import type { CssProp } from '../types';

export type DevCssRulePayload = [
  key: string,
  css: string,
  callsite: SheetCallsite | null,
  priority?: SheetRule['priority'],
];

export function collectDevCssRules(
  css: CssProp | undefined,
): DevCssRulePayload[] {
  const rules: DevCssRulePayload[] = [];
  const lookup = new Map<string, number>();

  for (const item of collectCssPropItems(css)) {
    const rule = createRuntimeSheetRule(item);

    if (!rule?.key || !rule.dedupe) continue;

    const payload: DevCssRulePayload = [
      rule.key,
      rule.css,
      rule.callsite || null,
      rule.priority,
    ];

    const index = lookup.get(rule.dedupe);

    if (index === undefined) {
      lookup.set(rule.dedupe, rules.push(payload) - 1);
    } else {
      rules[index] = payload;
    }
  }

  return rules;
}
