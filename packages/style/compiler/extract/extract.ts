import { type CssConfig } from '../../config/config/css';
import { serializeOrderedRules } from '../../sheet/ordering';
import { DEFAULT_CONFIG } from '../utils/constants';
import type { CssExtractRule } from './types';

type CssOptions = Pick<CssConfig, 'layer' | 'layers' | 'layerNamespace'>;
export type CompilerExtractCssArgs = Partial<CssOptions>;

export function extractCss(items: CssExtractRule[], args: CompilerExtractCssArgs) {
  const seen = new Set<string>();
  const unique = items.filter((item) => {
    const key = JSON.stringify([
      item.globalSheet?.id,
      item.globalSheet?.order,
      item.sheet,
      item.layer,
      item.importantNative,
      item.css,
    ]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (!unique.length) return '';
  return serializeOrderedRules(unique, {
    layer: args.layer ?? DEFAULT_CONFIG.layer ?? true,
    layers: args.layers ?? DEFAULT_CONFIG.layers,
    layerNamespace: args.layerNamespace ?? DEFAULT_CONFIG.layerNamespace,
  });
}
