import { flattenCssLayers } from './layer';

export function getLayerOrderCss(
  layers: readonly string[],
  layerNames: string | readonly string[],
) {
  const names = flattenCssLayers(layers, layerNames);

  if (!names.length) return '';

  return '@layer ' + names.join(', ') + ';';
}

export function getLayerBlockCss(
  layerName: string,
  css: string,
) {
  return '@layer ' + layerName + ' {' + css + '}';
}

export function getLayerBundleCss(
  layers: readonly string[],
  layerName: string,
  css: readonly string[],
) {
  const output: string[] = [];
  const layerOrder = getLayerOrderCss(layers, layerName);

  if (layerOrder) {
    output.push(layerOrder);
  }

  output.push(getLayerBlockCss(layerName, '\n' + css.join('\n') + '\n'));

  return output.join('\n');
}

export function joinLayerCss(
  layerOrderCss: string,
  css: readonly string[],
) {
  const output: string[] = [];

  if (layerOrderCss) {
    output.push(layerOrderCss);
  }

  output.push(...css);

  return output.join('\n') + '\n';
}
