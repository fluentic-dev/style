import type { NamedAtRuleFormat, TokenNameFormat } from '../../config/types';
import type { AtRuleStyleObject } from '../../style';
import type { StyleTokenData } from '../../style/token';
import type { CSSProperties } from '../utils/types';
import { buildNamedAtRuleCss, createAtRuleNameFormatter } from './utils';

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

export const POSITION_TRY_AT_RULE = 'position-try';

export const formatPositionTryName = createAtRuleNameFormatter(
  'position-try[-(name)]-$hash',
  '--',
);

export function buildPositionTryCss(
  format: NamedAtRuleFormat | null,
  name: string | null,
  id: string,
  descriptors: PositionTryObject,
  tokens: StyleTokenData[],
  tokenLookup: Set<string>,
  tokenNameFormat: TokenNameFormat | null,
) {
  name = formatPositionTryName(format, id, { name });

  const css = buildNamedAtRuleCss(
    POSITION_TRY_AT_RULE,
    name,
    descriptors,
    tokens,
    tokenLookup,
    tokenNameFormat,
  );

  return { name, css };
}
