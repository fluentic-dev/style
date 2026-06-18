import { compareLayerPriority, getLayerBundleCss } from '../../atomic/layer';
import type { CssConfig } from '../../config/config/css';
import { DEFAULT_CONFIG } from '../utils/constants';
import type { CssExtractRule } from './types';

type CssOptions = Pick<CssConfig, 'layers' | 'layerNamespace'>;

export type CompilerExtractCssArgs = Partial<CssOptions> & {
  layer?: boolean;
};

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

  if (args.layer === false || !css.length) {
    return css.map((item) => item.css).join('\n');
  }

  const defaults = DEFAULT_CONFIG;

  const layerNamespace = args.layerNamespace ?? defaults.layerNamespace ?? '';
  const layers = args.layers ?? defaults.layers ?? [];

  return getLayerBundleCss(
    layers,
    layerNamespace,
    css.map((item) => item.css),
  );
}
