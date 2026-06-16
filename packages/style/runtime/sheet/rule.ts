import { buildAtomicRule, getAtomicRuleLayerPriority } from '../../atomic/rule';
import { BUILDER_TYPE_SCOPE } from '../../builder/data/const';
import type { RuntimeItem, StateItem } from '../../builder/data/state';
import type { SheetRule } from '../../sheet';
import { isStyleTokenOverrideData } from '../../style/token';
import { getStateItemAtRuleRef } from '../core/cache/stateItem';

export type RuntimeSheetRule = SheetRule & {
  dedupe: string;
};

export function createRuntimeSheetRules(item: StateItem): RuntimeSheetRule[] | null {
  if (Array.isArray(item)) return null;
  if (isStyleTokenOverrideData(item)) return null;

  const runtimeItem = item as RuntimeItem;

  const value = Array.isArray(runtimeItem.value)
    ? runtimeItem.value[0]
    : runtimeItem.value;

  const priority = Array.isArray(runtimeItem.value)
    ? runtimeItem.value[1]
    : null;

  const parentSelector = runtimeItem.type === BUILDER_TYPE_SCOPE
    ? runtimeItem.parentSelector
    : null;

  const layerPriority = getAtomicRuleLayerPriority(
    runtimeItem.property,
    priority,
    runtimeItem.selector,
    parentSelector,
    runtimeItem.atRule,
    runtimeItem.type === BUILDER_TYPE_SCOPE,
  );

  const ruleCss = buildAtomicRule(
    runtimeItem.className,
    runtimeItem.property,
    value,
    runtimeItem.selector,
    parentSelector,
    runtimeItem.atRule,
  );

  const rule = {
    key: runtimeItem.className,
    dedupe: runtimeItem.dedupe,
    priority: layerPriority,
    css: ruleCss,
    callsite: runtimeItem.callsite,
    debug: runtimeItem.debug,
    debugField: runtimeItem.debugField,
  };

  const ref = getStateItemAtRuleRef(item);
  if (!ref?.css) return [rule];

  return [
    {
      key: ref.key,
      dedupe: ref.key,
      priority: null,
      css: ref.css,
      callsite: runtimeItem.callsite,
    },
    rule,
  ];
}

export function createRuntimeSheetRule(item: StateItem): RuntimeSheetRule | null {
  return createRuntimeSheetRules(item)?.[0] ?? null;
}
