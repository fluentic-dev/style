import type { types } from '@babel/core';
import type { CssExtractItem, CssExtractRule } from '../../../extract';

export type { CssExtractItem, CssExtractRule };

export type CompiledChainType = 'style' | 'slot' | 'scope';

export type CompiledChainItem = CssExtractItem & {
  valueNode?: types.Expression;
  hasParentSelector?: true;
};

export type CompiledChainData = {
  type: CompiledChainType;
  slotId?: string;
  items: CompiledChainItem[];
  rules: CssExtractRule[];
};
