import { globalData } from '../../utils/global';
import type { NamedAtRuleFormat } from '../types';

export type CssExtraConfig = {
  namedRuleFormat: {
    keyframes?: NamedAtRuleFormat;
    fontFace?: NamedAtRuleFormat;
    fontPaletteValues?: NamedAtRuleFormat;
    counterStyle?: NamedAtRuleFormat;
    positionTry?: NamedAtRuleFormat;
    property?: NamedAtRuleFormat;
  };
};

export const CSS_EXTRA_CONFIG_DEFAULT: CssExtraConfig = {
  namedRuleFormat: {},
};

export const CSS_EXTRA_CONFIG = globalData<CssExtraConfig>(
  'config.cssExtra',
  () => ({ ...CSS_EXTRA_CONFIG_DEFAULT }),
);
