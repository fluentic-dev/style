import { buildPositionTryCss, type PositionTryObject } from '../atomic/atRule/positionTry';
import { CSS_EXTRA_CONFIG } from '../config/config/css_extra';
import type { AtRuleRef } from '../style/valueRef';
import { createIdCounter, type StableId } from '../utils/id';
import { createNamedAtRuleRef } from './utils';

export type { PositionTryObject };

const idCounter = createIdCounter('positionTry');

export function createPositionTry(descriptors: PositionTryObject): AtRuleRef;
export function createPositionTry(descriptors: PositionTryObject, stableId?: StableId): AtRuleRef {
  return createNamedAtRuleRef({
    format: CSS_EXTRA_CONFIG.namedRuleFormat.positionTry,
    buildCss: buildPositionTryCss,
    value: descriptors,
    idCounter,
    stableId,
  });
}
