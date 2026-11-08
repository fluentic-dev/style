import { buildAtomicRule, getAtomicRuleLayerPriority } from '../../atomic/rule';
import type { CreateSheetOptions } from '../../builder/data';
import { BUILDER_TYPE_SCOPE } from '../../builder/data/const';
import type { RuntimeItem, StateItem } from '../../builder/data/state';
import { CSS_CONFIG, isSheetLayerEnabled } from '../../config/config/css';
import type { SheetRule } from '../../sheet';
import { isStyleTokenOverrideData } from '../../style/token';
import { getStateItemAtRuleRef } from '../core/cache/stateItem';

export type RuntimeSheetRule = SheetRule & {
  dedupe: string;
};

export function createRuntimeSheetRules(
  item: StateItem,
  sheetOptions: CreateSheetOptions | null = null,
): RuntimeSheetRule[] | null {
  if (Array.isArray(item)) return null;
  if (isStyleTokenOverrideData(item)) return null;

  const runtimeItem = item as RuntimeItem;

  const parentSelector = runtimeItem.type === BUILDER_TYPE_SCOPE
    ? runtimeItem.parentSelector
    : null;

  const layerPriority = getAtomicRuleLayerPriority(
    runtimeItem.property,
    runtimeItem.weight,
    runtimeItem.selector,
    parentSelector,
    runtimeItem.atRule,
    runtimeItem.type === BUILDER_TYPE_SCOPE,
  );

  const ruleCss = buildAtomicRule(
    runtimeItem.className,
    runtimeItem.property,
    runtimeItem.value,
    runtimeItem.important,
    runtimeItem.selector,
    parentSelector,
    runtimeItem.atRule,
    CSS_CONFIG.scopeClassNameFormat || null,
  );

  const rule = {
    key: runtimeItem.className,
    dedupe: runtimeItem.dedupe,
    priority: layerPriority,
    important: runtimeItem.important,
    layer: getRuntimeRuleLayer(sheetOptions),
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

function getRuntimeRuleLayer(sheetOptions: CreateSheetOptions | null): SheetRule['layer'] {
  if (!sheetOptions) return 'style';
  return (sheetOptions.layer ?? isSheetLayerEnabled()) ? 'sheet' : false;
}
