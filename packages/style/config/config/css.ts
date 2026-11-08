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

export function isSheetLayerEnabled(layer: CssConfig['layer'] = CSS_CONFIG.layer) {
  return typeof layer === 'object' && (layer.sheet ?? false);
}
