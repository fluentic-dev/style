import type { StyleTokenOverride } from '../../../../style/token';
import type { CssExtractItem, CssExtractRule } from '../../../extract';
import type { BabelTypes } from '../../utils/babel';

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

export type CompiledStyleSpreadItem = {
  kind: 'style-spread';
  expression: BabelTypes.Expression;
  items: CompiledCssItem[];
};

export type CompiledItem = CompiledCssItem | CompiledTokenItem | CompiledStyleSpreadItem;

export type CompiledChainData = {
  type: CompiledChainType;
  slotId?: string;
  items: CompiledItem[];
  rules: CssExtractRule[];
};
