import { BUILDER_STATE, BUILDER_TYPE_SLOT, BUILDER_TYPE_SLOT_OVERRIDE } from '../data/const';
import { createSlotData, createSlotOverrideData } from '../data/create';
import type { SlotData, SlotOverrideData } from '../data/data';
import type { ExtractedItemValue, ExtractedSlotItem, ExtractedSlotOverrideItem } from '../data/state';

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

  Object.assign(slot, createSlotData(null, slotId));

  slot[BUILDER_STATE].items = normalizeSlotItems(slotId, items);

  return slot as unknown as SlotData;
}

export function createExtractedSlotOverride(
  slotId: string,
  items: ExtractedSlotTuple[],
): SlotOverrideData {
  const data = createSlotOverrideData(null, slotId);

  data[BUILDER_STATE].items = normalizeSlotOverrideItems(slotId, items);

  return data;
}

function normalizeSlotItems(
  slotId: string,
  items: ExtractedSlotTuple[],
): ExtractedSlotItem[] {
  const normalized: ExtractedSlotItem[] = [];

  let i = 0;
  while (i < items.length) {
    const item = items[i];
    const dedupe = item[0];
    const className = item[1];
    const value = item[2];

    if (value === undefined) {
      normalized.push([BUILDER_TYPE_SLOT, slotId, dedupe, className]);
    } else {
      normalized.push([BUILDER_TYPE_SLOT, slotId, dedupe, className, value]);
    }

    i++;
  }

  return normalized;
}

function normalizeSlotOverrideItems(
  slotId: string,
  items: ExtractedSlotTuple[],
): ExtractedSlotOverrideItem[] {
  const normalized: ExtractedSlotOverrideItem[] = [];

  let i = 0;
  while (i < items.length) {
    const item = items[i];
    const dedupe = item[0];
    const className = item[1];
    const value = item[2];

    if (value === undefined) {
      normalized.push([BUILDER_TYPE_SLOT_OVERRIDE, slotId, dedupe, className]);
    } else {
      normalized.push([BUILDER_TYPE_SLOT_OVERRIDE, slotId, dedupe, className, value]);
    }

    i++;
  }

  return normalized;
}
