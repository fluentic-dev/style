import { compareLayerPriority, getLayerBlockCss, getLayerOrderCss } from '../../atomic/layer';
import { type CssConfig, isStyleLayerEnabled } from '../../config/config/css';
import { DEFAULT_CONFIG } from '../utils/constants';
import type { CssExtractRule } from './types';

type CssOptions = Pick<CssConfig, 'layer' | 'layers' | 'layerNamespace'>;

export type CompilerExtractCssArgs = Partial<CssOptions>;

export function extractCss(
  items: CssExtractRule[],
  args: CompilerExtractCssArgs,
) {
  return getExtractedCssItems(items, args);
}

function getExtractedCssItems(
  items: CssExtractRule[],
  args: CompilerExtractCssArgs,
): string {
  const sortedItems = items
    .slice()
    .sort((a, b) => compareLayerPriority(a.priority, b.priority));

  const seen = new Set<string>();
  const css: CssExtractRule[] = [];

  for (const item of sortedItems) {
    if (seen.has(item.css)) continue;

    seen.add(item.css);
    css.push(item);
  }

  if (!css.length) return '';

  const defaults = DEFAULT_CONFIG;

  const layerNamespace = args.layerNamespace ?? defaults.layerNamespace ?? '';
  const layers = args.layers ?? defaults.layers ?? [];
  const styleLayer = isStyleLayerEnabled(args.layer ?? defaults.layer);
  const sheetLayerName = layerNamespace ? layerNamespace + '.sheet' : 'sheet';
  const styleItems: string[] = [];
  const sheetItems: string[] = [];
  const unlayeredItems: string[] = [];

  for (let i = 0, len = css.length; i < len; i++) {
    const item = css[i];
    if (item.layer === 'sheet') {
      sheetItems.push(item.css);
    } else if (item.layer === false || !styleLayer) {
      unlayeredItems.push(item.css);
    } else {
      styleItems.push(item.css);
    }
  }

  const styleLayerName = sheetItems.length && layerNamespace
    ? layerNamespace + '.style'
    : layerNamespace;

  const layerNames = [
    styleItems.length ? styleLayerName : '',
    sheetItems.length ? sheetLayerName : '',
  ].filter(Boolean);
  const output: string[] = [];
  const layerOrder = getLayerOrderCss(layers, layerNames);

  if (layerOrder) output.push(layerOrder);
  if (styleItems.length) {
    output.push(getLayerBlockCss(styleLayerName, '\n' + styleItems.join('\n') + '\n'));
  }
  if (sheetItems.length) {
    output.push(getLayerBlockCss(sheetLayerName, '\n' + sheetItems.join('\n') + '\n'));
  }
  output.push(...unlayeredItems);

  return output.join('\n');
}
