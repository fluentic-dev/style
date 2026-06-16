import { buildScrollTimelineCss, type ScrollTimelineObject } from '../atomic/atRule/scrollTimeline';
import { AT_RULE_REF_TYPE_SCROLL_TIMELINE, type AtRuleRef, createAtRuleRef } from '../style/valueRef';
import {
  createAtRuleCssOptions,
  createAtRuleIdCounter,
  createAtRuleName,
  createAtRuleTokens,
  nextAtRuleId,
} from './utils';

export type { ScrollTimelineObject };

const idCounter = createAtRuleIdCounter('scrollTimeline');

export function createScrollTimeline(descriptors: ScrollTimelineObject): AtRuleRef;
export function createScrollTimeline(descriptors: ScrollTimelineObject, stableId?: string): AtRuleRef {
  const id = nextAtRuleId(idCounter, stableId);
  const name = createAtRuleName(id, 'st', true);

  const { tokens, tokenLookup } = createAtRuleTokens();
  const css = buildScrollTimelineCss(name, descriptors, tokens, tokenLookup, createAtRuleCssOptions());

  return createAtRuleRef({
    type: AT_RULE_REF_TYPE_SCROLL_TIMELINE,
    key: 'scroll-timeline:' + name,
    value: name,
    css,
    tokens: tokens.length ? tokens : undefined,
  });
}
