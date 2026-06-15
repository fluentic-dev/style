import type { types } from '@babel/core';
import type { CssExtractItem, CssExtractRule } from '../../../extract';
import type { StyleTokenOverride } from '../../../../style/token';

export type { CssExtractItem, CssExtractRule };

export type CompiledChainType = 'style' | 'slot' | 'scope';

export type CompiledCssItem = CssExtractItem & {
  valueNode?: types.Expression;
  hasParentSelector?: true;
};

export type CompiledTokenItem = {
  kind: 'token';
  tokenId: string;
  value: StyleTokenOverride;
  valueNode: types.Expression;
};

export type CompiledItem = CompiledCssItem | CompiledTokenItem;

export type CompiledChainData = {
  type: CompiledChainType;
  slotId?: string;
  items: CompiledItem[];
  rules: CssExtractRule[];
};
