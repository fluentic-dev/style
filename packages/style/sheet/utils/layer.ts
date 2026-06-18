import { createLayerPool, LayerDefaultNamespace, LayerDefaultPriority, type LayerPriority } from '../../atomic/layer';
import { CSS_CONFIG } from '../../config/config/css';

export function createSheetLayerState() {
  return createLayerPool(getStyleLayerName());
}

export function getSheetRulePriority(priority: LayerPriority | null | undefined) {
  return priority ?? LayerDefaultPriority;
}

export function getStyleLayerName() {
  return CSS_CONFIG.layerNamespace || LayerDefaultNamespace;
}
