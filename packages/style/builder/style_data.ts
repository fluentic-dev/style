import type { StyleObject } from '../style/types';
import {
  BUILDER_SLOT_ID,
  BUILDER_TYPE_SLOT,
  BUILDER_TYPE_SLOT_OVERRIDE,
  BUILDER_TYPE_STYLE,
  type BuilderCallsite,
  type BuilderData,
  type BuilderType,
  type CreateData,
  createSlotData,
  createSlotOverrideData,
  createStyleData,
  type DebugData,
  type ItemSelector,
  mergeBuilderData,
  type SlotData,
  type SlotOverrideData,
  type StyleData,
} from './data';

export type MergeData<Data extends BuilderData> = (
  data: Data,
  callsite: BuilderCallsite | null,
  style: StyleObject | StyleData | null,
  debug: DebugData | null,
  selector: ItemSelector | null,
  atRule: ItemSelector[] | null,
) => Data;

const mergeStyleCreate: CreateData<StyleData> = (callsite) => {
  return createStyleData(callsite);
};

export const mergeStyleData = createMerge(
  mergeStyleCreate,
  BUILDER_TYPE_STYLE,
);

const mergeSlotCreate: CreateData<SlotData> = (callsite, data) => {
  return createSlotData(callsite, data[BUILDER_SLOT_ID]);
};

export const mergeSlotData = createMerge(
  mergeSlotCreate,
  BUILDER_TYPE_SLOT,
);

const mergeSlotOverrideCreate: CreateData<SlotOverrideData> = (callsite, data) => {
  return createSlotOverrideData(callsite, data[BUILDER_SLOT_ID]);
};

export const mergeSlotOverrideData = createMerge(
  mergeSlotOverrideCreate,
  BUILDER_TYPE_SLOT_OVERRIDE,
);

function createMerge<Data extends BuilderData>(
  create: CreateData<Data>,
  type: BuilderType,
): MergeData<Data> {
  return (
    data,
    callsite,
    style,
    debug,
    selector,
    atRule,
  ) => {
    return mergeBuilderData(
      create,
      callsite,
      data,
      style,
      debug,
      selector,
      atRule,
      type,
    );
  };
}
