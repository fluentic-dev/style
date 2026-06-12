import { createLayerPool } from './layer';
import { compareLayerPriority } from './layer';
import { LayerDefaultNamespace, LayerPlaceholder, type LayerPriority } from './types';

export type LayeredCssItem = {
  css: string;
  priority: LayerPriority;
};

export function getCssLayerName(
  layerNamespace: string | null | undefined,
  fallback = LayerDefaultNamespace,
) {
  return layerNamespace || fallback;
}

export function getCssLayerNames(
  layers: readonly string[],
  layerName: string,
) {
  return layers
    .map((layer) => layer === LayerPlaceholder ? layerName : layer)
    .filter(Boolean);
}

export function getCssLayerOrderNames(
  layers: readonly string[],
  layerNames: readonly string[],
) {
  return layers
    .flatMap((layer) => layer === LayerPlaceholder ? layerNames : layer)
    .filter(Boolean);
}

export function getCssLayerOrderRule(
  layers: readonly string[],
  layerName: string | readonly string[],
) {
  const layerNames = typeof layerName === 'string'
    ? getCssLayerNames(layers, layerName)
    : getCssLayerOrderNames(layers, layerName);

  if (!layerNames.length) return '';

  return '@layer ' + layerNames.join(', ') + ';';
}

export function wrapCssInLayer(
  css: string,
  layerName: string,
) {
  return '@layer ' + layerName + ' {' + css + '}';
}

export function formatLayeredCss(
  css: readonly string[],
  layers: readonly string[],
  layerName: string,
) {
  const output: string[] = [];
  const layerOrder = getCssLayerOrderRule(layers, layerName);

  if (layerOrder) {
    output.push(layerOrder);
  }

  output.push(wrapCssInLayer('\n' + css.join('\n') + '\n', layerName));

  return output;
}

export function formatLayeredCssRules(
  items: readonly LayeredCssItem[],
  layers: readonly string[],
  layerNamespace: string,
) {
  const sorted = items
    .slice()
    .sort((a, b) => compareLayerPriority(a.priority, b.priority));
  const pool = createLayerPool();
  const layerNames: string[] = [];
  const layerNameLookup = new Set<string>();
  const groups: Record<string, string[]> = {};

  for (const item of sorted) {
    const layerName = pool.getLayerName(layerNamespace, item.priority);

    if (!layerNameLookup.has(layerName)) {
      layerNameLookup.add(layerName);
      layerNames.push(layerName);
      groups[layerName] = [];
    }

    groups[layerName].push(item.css);
  }

  const output: string[] = [];
  const layerOrder = getCssLayerOrderRule(layers, layerNames);

  if (layerOrder) {
    output.push(layerOrder);
  }

  for (const layerName of layerNames) {
    output.push(wrapCssInLayer('\n' + groups[layerName].join('\n') + '\n', layerName));
  }

  return output;
}
