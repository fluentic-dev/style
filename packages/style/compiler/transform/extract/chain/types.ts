import type { types } from '@babel/core';
import type { CssExtractItem, CssExtractRule } from '../../../extract';

export type { CssExtractItem, CssExtractRule };

export type CompiledChainType = 'style' | 'slot' | 'scope';

export type CompiledCssItem = CssExtractItem & {
  valueNode?: types.Expression;
  hasParentSelector?: true;
};

export type CompiledTokenItem = {
  kind: 'token';
  valueNode: types.Expression;
};

export type CompiledItem = CompiledCssItem | CompiledTokenItem;

export type CompiledChainData = {
  type: CompiledChainType;
  slotId?: string;
  items: CompiledItem[];
  rules: CssExtractRule[];
};
