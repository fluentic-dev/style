import type { LayerPriority } from '../../atomic/layer';
import type {
  ExtractedScopeItem,
  ExtractedSlotItem,
  ExtractedSlotOverrideItem,
  ExtractedStyleItem,
} from '../../builder/data';
import type { TRACE_STYLE, TRACE_VALUE } from '../../builder/data/debug';
import type { NamedSheetLayer } from '../../config/config/css';

export type CssExtractStyleItem = ExtractedStyleItem;

export type CssExtractSlotItem = ExtractedSlotItem;

export type CssExtractSlotOverrideItem = ExtractedSlotOverrideItem;

export type CssExtractScopeItem = ExtractedScopeItem;

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
  important?: boolean;
  importantNative?: boolean;
  sheet?: boolean;
  globalSheet?: { id: string; order: number; };
  layer?: 'style' | 'sheet' | false | NamedSheetLayer;
  trace?: {
    filePath: string;
    line: number;
    column: number;
    trace?: typeof TRACE_STYLE | typeof TRACE_VALUE;
  };
};
