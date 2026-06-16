import type { StyleTokenData } from '../../style/token';
import type { CSSProperties } from '../utils/types';
import { type AtRuleCssOptions, buildNamedAtRuleCss } from './utils';

export type ViewTimelineSubject = 'auto' | `selector(${string})` | (string & {});

export type ViewTimelineObject = {
  subject?: ViewTimelineSubject;
  axis?: CSSProperties['viewTimelineAxis'];
  inset?: CSSProperties['viewTimelineInset'];
};

export function buildViewTimelineCss(
  name: string,
  descriptors: ViewTimelineObject,
  tokens: StyleTokenData[],
  tokenLookup: Set<string>,
  options?: AtRuleCssOptions,
) {
  return buildNamedAtRuleCss(
    'view-timeline',
    name,
    descriptors,
    tokens,
    tokenLookup,
    options,
  );
}
