import { getStyleTokenId, isStyleTokenOverrideData } from '../../builder/token/data';
import type { TokenValueResolver } from '../core/cache/tokenValues';
import { getExtractedTokenOverrideValue } from './token';

export const extractedTokenValueResolver: TokenValueResolver = {
  key: null,

  is: isStyleTokenOverrideData,

  id(token) {
    return getStyleTokenId(token);
  },

  value(token) {
    return getExtractedTokenOverrideValue(token);
  },
};
