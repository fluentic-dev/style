import {
  createLayerPool,
  LayerDefaultNamespace,
  LayerDefaultPriority,
  type LayerPriority,
} from '../../atomic/layer';
import { RUNTIME_CONFIG } from '../../config';

export function createSheetLayerState() {
  return createLayerPool(getStyleLayerName());
}

export function getSheetRulePriority(priority: LayerPriority | null | undefined) {
  return priority ?? LayerDefaultPriority;
}

export function getStyleLayerName() {
  return RUNTIME_CONFIG.layerNamespace || LayerDefaultNamespace;
}
