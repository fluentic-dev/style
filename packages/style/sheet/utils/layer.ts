import { createLayerPool, LayerDefaultNamespace, LayerDefaultPriority, type LayerPriority } from '../../atomic/layer';
import { CSS_CONFIG } from '../../config/config/css';

export function createSheetLayerState() {
  return createLayerPool(getStyleLayerName());
}

export function getSheetRulePriority(priority: LayerPriority | null | undefined) {
  return priority ?? LayerDefaultPriority;
}

export function getSheetRuleLayerPriority(
  priority: LayerPriority | null | undefined,
  important: boolean | null | undefined,
): LayerPriority {
  const resolved = getSheetRulePriority(priority);

  // Cascade layer order is reversed for important declarations. Mirror the
  // atomic priority so a higher Fluentic priority still wins in that cascade.
  return important
    ? [
      -resolved[0],
      -resolved[1],
      -resolved[2],
      -resolved[3],
      -resolved[4],
      -resolved[5],
      -resolved[6],
    ]
    : resolved;
}

export function getStyleLayerName() {
  return CSS_CONFIG.layerNamespace || LayerDefaultNamespace;
}

export function getSheetLayerName() {
  return getStyleLayerName() + '.sheet';
}

export function getSheetLayerNames(
  layerState: ReturnType<typeof createSheetLayerState>,
  hasSheetLayer: boolean,
) {
  const names = layerState.getNames();
  return hasSheetLayer ? names.concat(getSheetLayerName()) : names;
}
