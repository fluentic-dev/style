import type { StyleTokenData } from '../../style/token';
import { type AtRuleCssOptions, buildNamedAtRuleCss } from './utils';

export type ScrollTimelineSource = 'auto' | 'root' | 'nearest' | `selector(${string})` | (string & {});
export type ScrollTimelineOrientation = 'block' | 'inline' | 'horizontal' | 'vertical' | (string & {});

export type ScrollTimelineObject = {
  source?: ScrollTimelineSource;
  orientation?: ScrollTimelineOrientation;
  scrollOffsets?: string;
};

export function buildScrollTimelineCss(
  name: string,
  descriptors: ScrollTimelineObject,
  tokens: StyleTokenData[],
  tokenLookup: Set<string>,
  options?: AtRuleCssOptions,
) {
  return buildNamedAtRuleCss(
    'scroll-timeline',
    name,
    descriptors,
    tokens,
    tokenLookup,
    options,
  );
}
