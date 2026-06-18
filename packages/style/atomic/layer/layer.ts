import { LayerPlaceholder } from '../../config';
import { hashString } from '../../utils/hash';
import type { LayerPriority } from './types';

export function compareLayerPriority(
  p1: LayerPriority,
  p2: LayerPriority,
) {
  // Priority expands from broad domains into narrower ones:
  // value -> direct selector -> parent selector -> media -> scope/origin -> property.
  return (
    // Explicit value weight wins across all lower priority domains.
    p1[0] - p2[0] ||
    // Direct selector bucket: base < parent-only < selector < priority selector.
    p1[1] - p2[1] ||
    // Parent selector bucket inside the same direct selector bucket.
    p1[2] - p2[2] ||
    // Media bucket inside the same selector/parent selector bucket.
    p1[3] - p2[3] ||
    // Nested at-rule depth inside the same media bucket.
    p1[4] - p2[4] ||
    // Scope-origin tiebreaker inside the same contextual bucket.
    p1[5] - p2[5] ||
    // Property bucket: shorthand < intermediate < longhand.
    p1[6] - p2[6]
  );
}

export function createLayerNamePool() {
  const lookup: Map<string, string> = new Map();

  const getLayerId = (priority: LayerPriority) => {
    const key = priority.join('|');

    let name = lookup.get(key);
    if (name) return name;

    name = 'p' + hashString(key);
    lookup.set(key, name);

    return name;
  };

  const getLayerName = (layerNamespace: string, priority: LayerPriority) => {
    const layerId = getLayerId(priority);

    return layerNamespace ? layerNamespace + '.' + layerId : layerId;
  };

  return { getLayerName, getLayerId };
}

export function createLayerPool(layerNamespace: string) {
  const namePool = createLayerNamePool();
  const priorities = new Map<string, LayerPriority>();

  const getName = (priority: LayerPriority) => {
    const key = priority.join('|');

    if (!priorities.has(key)) priorities.set(key, priority);

    return namePool.getLayerName(layerNamespace, priority);
  };

  const getNames = () => {
    const names = Array.from(priorities.values())
      .sort(compareLayerPriority)
      .map((priority) => namePool.getLayerName(layerNamespace, priority));

    return names;
  };

  return { getName, getNames };
}

export function ensureLayerPlaceholder(layers: string[]) {
  layers = layers.filter(Boolean);

  return layers.includes(LayerPlaceholder)
    ? layers
    : layers.concat(LayerPlaceholder);
}

export function flattenCssLayers(
  layers: readonly string[],
  layerNames: string | readonly string[],
) {
  const names = typeof layerNames === 'string'
    ? [layerNames]
    : layerNames;

  return layers
    .flatMap((layer) => layer === LayerPlaceholder ? names : layer)
    .filter(Boolean);
}
