import {
  BUILDER_CALLSITE,
  BUILDER_SCOPE,
  BUILDER_SCOPE_ID,
  BUILDER_SLOT_ID,
  BUILDER_STATE,
  BUILDER_TYPE,
  BUILDER_TYPE_SCOPE_TARGET,
  type BUILDER_TYPE_SLOT,
  type BUILDER_TYPE_SLOT_OVERRIDE,
  type BUILDER_TYPE_STYLE,
} from '../data/const';
import type { ExtractedItemValue, StateItem } from '../data/state';

type ExtractedTuple = [
  dedupe: string,
  className: string,
  value?: ExtractedItemValue,
];

type ExtractedItemType =
  | typeof BUILDER_TYPE_STYLE
  | typeof BUILDER_TYPE_SLOT
  | typeof BUILDER_TYPE_SLOT_OVERRIDE;

type ExtractedDataShape = {
  [BUILDER_TYPE]: number;
  [BUILDER_STATE]: { items: StateItem[]; lookup: {}; };
  [BUILDER_CALLSITE]: null;
  [BUILDER_SLOT_ID]?: string;
};

export function createExtractedData(type: number, slotId?: string): ExtractedDataShape {
  const data: ExtractedDataShape = {
    [BUILDER_TYPE]: type,
    [BUILDER_STATE]: { items: [], lookup: {} },
    [BUILDER_CALLSITE]: null,
  };

  if (slotId !== undefined) {
    data[BUILDER_SLOT_ID] = slotId;
  }

  return data;
}

export function copyExtractedData(target: object, source: ExtractedDataShape) {
  const mutable = target as ExtractedDataShape;

  mutable[BUILDER_TYPE] = source[BUILDER_TYPE];
  mutable[BUILDER_STATE] = source[BUILDER_STATE];
  mutable[BUILDER_CALLSITE] = source[BUILDER_CALLSITE];

  if (source[BUILDER_SLOT_ID] !== undefined) {
    mutable[BUILDER_SLOT_ID] = source[BUILDER_SLOT_ID];
  }
}

export function createExtractedScopeTarget(scope: object, slot: { [BUILDER_SLOT_ID]: string; }) {
  return {
    [BUILDER_TYPE]: BUILDER_TYPE_SCOPE_TARGET,
    [BUILDER_SCOPE]: scope,
    [BUILDER_SCOPE_ID]: slot[BUILDER_SLOT_ID],
  };
}

export function normalizeExtractedItems(
  type: ExtractedItemType,
  slotId: string | null,
  items: ExtractedTuple[],
): StateItem[] {
  const normalized: StateItem[] = [];

  let i = 0;
  while (i < items.length) {
    const item = items[i];
    const value = item[2];

    normalized.push(
      (
        value === undefined
          ? slotId === null
            ? [type, item[0], item[1]]
            : [type, slotId, item[0], item[1]]
          : slotId === null
          ? [type, item[0], item[1], value]
          : [type, slotId, item[0], item[1], value]
      ) as StateItem,
    );

    i++;
  }

  return normalized;
}
