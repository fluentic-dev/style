import { getTokenOverrideValue } from '../../../atomic/token';
import { CSS_CONFIG } from '../../../config/config/css';
import { getStyleTokenId, isStyleTokenOverrideData } from '../../../style/token';
import type { TokenValueResolver } from './tokenValues';

export const runtimeTokenValueResolver: TokenValueResolver = {
  get key() {
    return CSS_CONFIG.tokenNameFormat;
  },

  is: isStyleTokenOverrideData,

  id(token) {
    return getStyleTokenId(token);
  },

  value(token) {
    return getTokenOverrideValue(token, CSS_CONFIG.tokenNameFormat ?? null);
  },
};
