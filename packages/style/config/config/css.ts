import { globalData } from '../../utils/global';
import { LayerPlaceholder } from '../constants';
import type {
  ClassNameFormat,
  ElementClassNameFormat,
  ScopeClassNameFormat,
  ThemeNameFormat,
  TokenNameFormat,
  TransformClassNameFormat,
} from '../types';

export type CssLayerTargets = {
  style?: boolean;
  sheet?: boolean;
};

export type CssConfig = {
  layer: boolean | CssLayerTargets;
  layers?: string[];
  layerNamespace?: string;
  hashLength?: number;
  classNameFormat?: ClassNameFormat;
  sheetClassNameFormat?: ClassNameFormat;
  transformClassNameFormat?: TransformClassNameFormat;
  scopeClassNameFormat?: ScopeClassNameFormat;
  elementClassNameFormat?: ElementClassNameFormat;
  themeNameFormat?: ThemeNameFormat;
  tokenNameFormat?: TokenNameFormat;
  varNameFormat?: TokenNameFormat;
};

export const CSS_CONFIG_DEFAULT: CssConfig = {
  layer: true,
  layers: [LayerPlaceholder],
  layerNamespace: 'css',
};

export const CSS_CONFIG = globalData<CssConfig>(
  'config.css',
  () => ({ ...CSS_CONFIG_DEFAULT }),
);

export function isStyleLayerEnabled(layer: CssConfig['layer'] = CSS_CONFIG.layer) {
  return typeof layer === 'boolean' ? layer : layer.style ?? true;
}

// Named sheet layers are kept distinct from the internal style/sheet targets.
export type NamedSheetLayer = { name: string; };

export function isSheetLayerOption(value: unknown): value is boolean | string | undefined {
  return value === undefined || typeof value === 'boolean' || (
    typeof value === 'string' &&
    /^\.?(?:--|-?[a-zA-Z_\u0080-\uFFFF])[\w\u0080-\uFFFF-]*(?:\.(?:--|-?[a-zA-Z_\u0080-\uFFFF])[\w\u0080-\uFFFF-]*)*$/
      .test(value)
  );
}

export function resolveSheetLayerOption(
  layer: boolean | string,
  namespace: string,
): 'sheet' | false | NamedSheetLayer {
  if (typeof layer !== 'string') return layer ? 'sheet' : false;
  return { name: layer.startsWith('.') ? (namespace ? namespace + layer : layer.slice(1)) : layer };
}

export function isSheetLayerEnabled(layer: CssConfig['layer'] = CSS_CONFIG.layer) {
  return typeof layer === 'object' && (layer.sheet ?? false);
}
