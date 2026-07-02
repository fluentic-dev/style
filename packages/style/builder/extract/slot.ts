import { BUILDER_STATE, BUILDER_TYPE_SLOT, BUILDER_TYPE_SLOT_OVERRIDE } from '../data/const';
import type { SlotData, SlotOverrideData } from '../data/data';
import type { ExtractedItemValue } from '../data/state';
import { copyExtractedData, createExtractedData, normalizeExtractedItems } from './utils';

export type ExtractedSlotTuple = [
  dedupe: string,
  className: string,
  value?: ExtractedItemValue,
];

export function createExtractedSlot(
  slotId: string,
  items: ExtractedSlotTuple[],
): SlotData {
  const slot = ((items?: ExtractedSlotTuple[]) => {
    return createExtractedSlotOverride(slotId, items ?? []);
  }) as unknown as SlotData;

  copyExtractedData(slot, createExtractedData(BUILDER_TYPE_SLOT, slotId));

  slot[BUILDER_STATE].items = normalizeExtractedItems(BUILDER_TYPE_SLOT, slotId, items);

  return slot as unknown as SlotData;
}

export function createExtractedSlotOverride(
  slotId: string,
  items: ExtractedSlotTuple[],
): SlotOverrideData {
  const data = createExtractedData(BUILDER_TYPE_SLOT_OVERRIDE, slotId) as unknown as SlotOverrideData;

  data[BUILDER_STATE].items = normalizeExtractedItems(BUILDER_TYPE_SLOT_OVERRIDE, slotId, items);

  return data;
}
