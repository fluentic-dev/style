import type { NamedAtRuleFormat, TokenNameFormat } from '../../config/types';
import type { StyleTokenData } from '../../style/token';
import type { AtRuleStyleObject, CSSProperties } from '../../style/types';
import { buildAtRuleDeclarationCss, createAtRuleNameFormatter } from './utils';

export type KeyframeSelector = 'from' | 'to' | `${number}%` | (string & {});

export type KeyframesObject<Style = CSSProperties> = {
  [Selector in KeyframeSelector]?: AtRuleStyleObject<Style>;
};

export const KEYFRAMES_AT_RULE = 'keyframes';

export const formatKeyFramesName = createAtRuleNameFormatter(
  'keyframes[-(name)]-$hash',
);

export function buildKeyframesCss(
  format: NamedAtRuleFormat | null,
  name: string | null,
  id: string,
  frames: KeyframesObject,
  tokens: StyleTokenData[],
  tokenLookup: Set<string>,
  tokenNameFormat: TokenNameFormat | null,
) {
  name = formatKeyFramesName(format, id, { name });

  let css = `@${KEYFRAMES_AT_RULE} ${name} {`;

  for (const selector in frames) {
    const frame = frames[selector];
    if (!frame) continue;

    css += selector + '{';
    css += buildAtRuleDeclarationCss(frame, tokens, tokenLookup, tokenNameFormat, false);
    css += '}';
  }

  css += '}';

  return { name, css };
}
