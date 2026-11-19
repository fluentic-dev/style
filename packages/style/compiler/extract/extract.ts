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
    const key = JSON.stringify([item.layer, item.css]);
    if (seen.has(key)) continue;

    seen.add(key);
    css.push(item);
  }

  if (!css.length) return '';

  const defaults = DEFAULT_CONFIG;

  const layerNamespace = args.layerNamespace ?? defaults.layerNamespace ?? '';
  const layers = args.layers ?? defaults.layers ?? [];
  const styleLayer = isStyleLayerEnabled(args.layer ?? defaults.layer);
  const sheetLayerName = layerNamespace ? layerNamespace + '.sheet' : 'sheet';
  const styleItems: string[] = [];
  const sheetItems = new Map<string, string[]>();
  const unlayeredItems: string[] = [];

  for (let i = 0, len = css.length; i < len; i++) {
    const item = css[i];
    if (item.layer === 'sheet' || typeof item.layer === 'object') {
      const name = typeof item.layer === 'object' ? item.layer.name : sheetLayerName;
      const rules = sheetItems.get(name) ?? [];
      rules.push(item.css);
      sheetItems.set(name, rules);
    } else if (item.layer === false || !styleLayer) {
      unlayeredItems.push(item.css);
    } else {
      styleItems.push(item.css);
    }
  }

  const hasNestedSheetLayer = [...sheetItems.keys()].some((name) => name.startsWith(layerNamespace + '.'));
  const styleLayerName = hasNestedSheetLayer && layerNamespace
    ? layerNamespace + '.style'
    : layerNamespace;

  const layerNames = [
    styleItems.length ? styleLayerName : '',
    ...sheetItems.keys(),
  ].filter(Boolean);
  const output: string[] = [];
  const layerOrder = getLayerOrderCss(layers, layerNames);

  if (layerOrder) output.push(layerOrder);
  if (styleItems.length) {
    output.push(getLayerBlockCss(styleLayerName, '\n' + styleItems.join('\n') + '\n'));
  }
  for (const [name, rules] of sheetItems) {
    output.push(getLayerBlockCss(name, '\n' + rules.join('\n') + '\n'));
  }
  output.push(...unlayeredItems);

  return output.join('\n');
}
