import type { BabelTypes } from '../../utils/babel';
import type { StyleTokenOverride } from '../../../../style/token';
import type { CssExtractItem, CssExtractRule } from '../../../extract';

export type { CssExtractItem, CssExtractRule };

export type CompiledChainType = 'style' | 'slot' | 'scope';

export type CompiledCssItem = CssExtractItem & {
  valueNode?: BabelTypes.Expression;
  hasParentSelector?: true;
};

export type CompiledTokenItem = {
  kind: 'token';
  tokenId: string;
  value: StyleTokenOverride;
  valueNode: BabelTypes.Expression;
};

export type CompiledItem = CompiledCssItem | CompiledTokenItem;

export type CompiledChainData = {
  type: CompiledChainType;
  slotId?: string;
  items: CompiledItem[];
  rules: CssExtractRule[];
};
