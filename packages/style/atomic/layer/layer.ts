import { hashString } from '../../utils/hash';
import type { LayerPriority } from './types';

export function compareLayerPriority(
  p1: LayerPriority,
  p2: LayerPriority,
) {
  return (
    p1[0] - p2[0] ||
    p1[1] - p2[1] ||
    p1[2] - p2[2] ||
    p1[3] - p2[3] ||
    p1[4] - p2[4] ||
    p1[5] - p2[5] ||
    p1[6] - p2[6]
  );
}

export function createLayerPool() {
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
