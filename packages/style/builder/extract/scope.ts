import type { StyleTokenOverride } from '../../style/token';
import { BUILDER_STATE, BUILDER_TYPE_SCOPE } from '../data/const';
import { createScopeData, createScopeTargetData } from '../data/create';
import type { ScopeData, SlotData } from '../data/data';

export type ExtractedScopeTuple = [
  type: typeof BUILDER_TYPE_SCOPE,
  slotId: string,
  dedupe: string,
  className: string,
  hasParentSelector?: true,
];

export type ExtractedScopeItem = ExtractedScopeTuple | StyleTokenOverride;

export function createExtractedScope(
  items: ExtractedScopeItem[],
): ScopeData {
  const scope = ((slot: SlotData) => {
    return createScopeTargetData(scope, slot);
  }) as unknown as ScopeData;

  Object.assign(scope, createScopeData(null));

  scope[BUILDER_STATE].items = items;

  return scope;
}
