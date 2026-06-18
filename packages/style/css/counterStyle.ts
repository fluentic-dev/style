import { buildCounterStyleCss, type CounterStyleObject } from '../atomic/atRule/counterStyle';
import { CSS_EXTRA_CONFIG } from '../config/config/css_extra';
import type { AtRuleRef } from '../style/valueRef';
import { createIdCounter, type StableId } from '../utils/id';
import { createNamedAtRuleRef } from './utils';

export type { CounterStyleObject };

const idCounter = createIdCounter('counterStyle');

export function createCounterStyle(descriptors: CounterStyleObject): AtRuleRef;
export function createCounterStyle(descriptors: CounterStyleObject, stableId?: StableId): AtRuleRef {
  return createNamedAtRuleRef({
    format: CSS_EXTRA_CONFIG.namedRuleFormat.counterStyle,
    buildCss: buildCounterStyleCss,
    value: descriptors,
    idCounter,
    stableId,
  });
}
