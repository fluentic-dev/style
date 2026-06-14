import type { LayerPriority } from '../../atomic/layer';
import type {
  BUILDER_TYPE_SCOPE,
  ExtractedScopeItem,
  ExtractedSlotItem,
  ExtractedSlotOverrideItem,
  ExtractedStyleItem,
} from '../../builder/data';

export type CssExtractStyleItem = ExtractedStyleItem;

export type CssExtractSlotItem = ExtractedSlotItem;

export type CssExtractSlotOverrideItem = ExtractedSlotOverrideItem;

export type CssExtractScopeItem = [
  type: typeof BUILDER_TYPE_SCOPE,
  slotId: ExtractedScopeItem[1],
  dedupe: ExtractedScopeItem[2],
  className: ExtractedScopeItem[3],
];

export type CssExtractItem =
  | CssExtractStyleItem
  | CssExtractSlotItem
  | CssExtractSlotOverrideItem
  | CssExtractScopeItem;

export type CssExtractRule = {
  dedupe: string;
  className: string;
  css: string;
  priority: LayerPriority;
  trace?: {
    filePath: string;
    line: number;
    column: number;
  };
};
