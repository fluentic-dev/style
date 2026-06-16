import type { AtRuleStyleObject } from '../../style';
import type { StyleTokenData } from '../../style/token';
import type { CSSProperties } from '../utils/types';
import { type AtRuleCssOptions, buildNamedAtRuleCss } from './utils';

type Properties = Pick<
  CSSProperties,
  | 'positionArea'
  | 'insetArea'
  | 'top'
  | 'right'
  | 'bottom'
  | 'left'
  | 'inset'
  | 'insetBlock'
  | 'insetBlockStart'
  | 'insetBlockEnd'
  | 'insetInline'
  | 'insetInlineStart'
  | 'insetInlineEnd'
  | 'width'
  | 'minWidth'
  | 'maxWidth'
  | 'height'
  | 'minHeight'
  | 'maxHeight'
  | 'blockSize'
  | 'minBlockSize'
  | 'maxBlockSize'
  | 'inlineSize'
  | 'minInlineSize'
  | 'maxInlineSize'
  | 'margin'
  | 'marginBlock'
  | 'marginBlockStart'
  | 'marginBlockEnd'
  | 'marginInline'
  | 'marginInlineStart'
  | 'marginInlineEnd'
>;

export type PositionTryObject = AtRuleStyleObject<Properties>;

export function buildPositionTryCss(
  name: string,
  descriptors: PositionTryObject,
  tokens: StyleTokenData[],
  tokenLookup: Set<string>,
  options?: AtRuleCssOptions,
) {
  return buildNamedAtRuleCss(
    'position-try',
    name,
    descriptors,
    tokens,
    tokenLookup,
    options,
  );
}
