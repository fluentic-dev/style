import { globalData } from '../../utils/global';
import { LayerPlaceholder } from '../constants';
import type {
  ClassNameFormat,
  ElementClassNameFormat,
  ScopeClassNameFormat,
  ThemeNameFormat,
  TokenNameFormat,
} from '../types';

export type CssConfig = {
  layer: boolean;
  layers?: string[];
  layerNamespace?: string;
  classNameFormat?: ClassNameFormat;
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
