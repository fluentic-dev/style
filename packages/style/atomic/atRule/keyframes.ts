import type { StyleTokenData } from '../../style/token';
import type { AtRuleStyleObject, CSSProperties } from '../../style/types';
import { type AtRuleCssOptions, buildAtRuleDeclarationCss } from './utils';

export type KeyframeSelector = 'from' | 'to' | `${number}%` | (string & {});

export type KeyframesObject<Style = CSSProperties> = {
  [Selector in KeyframeSelector]?: AtRuleStyleObject<Style>;
};

export function buildKeyframesCss(
  name: string,
  frames: KeyframesObject,
  tokens: StyleTokenData[],
  tokenLookup: Set<string>,
  options?: AtRuleCssOptions,
) {
  let css = `@keyframes ${name} {`;

  for (const selector in frames) {
    const frame = frames[selector];
    if (!frame) continue;

    css += selector + '{';
    css += buildAtRuleDeclarationCss(frame, tokens, tokenLookup, undefined, options);
    css += '}';
  }

  css += '}';

  return css;
}
