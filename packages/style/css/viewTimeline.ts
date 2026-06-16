import { buildViewTimelineCss, type ViewTimelineObject } from '../atomic/atRule/viewTimeline';
import { AT_RULE_REF_TYPE_VIEW_TIMELINE, type AtRuleRef, createAtRuleRef } from '../style/valueRef';
import {
  createAtRuleCssOptions,
  createAtRuleIdCounter,
  createAtRuleName,
  createAtRuleTokens,
  nextAtRuleId,
} from './utils';

export type { ViewTimelineObject };

const viewTimelineIdCounter = createAtRuleIdCounter('viewTimeline');

export function createViewTimeline(descriptors: ViewTimelineObject): AtRuleRef;
export function createViewTimeline(descriptors: ViewTimelineObject, stableId?: string): AtRuleRef {
  const id = nextAtRuleId(viewTimelineIdCounter, stableId);
  const name = createAtRuleName(id, 'vtl', true);

  const { tokens, tokenLookup } = createAtRuleTokens();
  const css = buildViewTimelineCss(name, descriptors, tokens, tokenLookup, createAtRuleCssOptions());

  return createAtRuleRef({
    type: AT_RULE_REF_TYPE_VIEW_TIMELINE,
    key: 'view-timeline:' + name,
    value: name,
    css,
    tokens: tokens.length ? tokens : undefined,
  });
}
