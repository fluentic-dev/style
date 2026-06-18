import { buildPropertyCss, type PropertyObject } from '../atomic/atRule/property';
import { CSS_EXTRA_CONFIG } from '../config/config/css_extra';
import type { AtRuleRef } from '../style/valueRef';
import { createIdCounter, type StableId } from '../utils/id';
import { createNamedAtRuleRef } from './utils';

export type { PropertyObject };

const idCounter = createIdCounter('property');

export function createProperty(descriptors: PropertyObject): AtRuleRef;
export function createProperty(descriptors: PropertyObject, stableId?: StableId): AtRuleRef;
export function createProperty(name: string, descriptors: PropertyObject): AtRuleRef;
export function createProperty(
  nameOrDescriptors: string | PropertyObject,
  descriptorsOrStableId?: PropertyObject | StableId,
): AtRuleRef {
  const descriptors = typeof nameOrDescriptors === 'string'
    ? descriptorsOrStableId as PropertyObject
    : nameOrDescriptors;
  const stableId = typeof nameOrDescriptors === 'string'
    ? { name: nameOrDescriptors, id: nameOrDescriptors }
    : descriptorsOrStableId as StableId | undefined;

  return createNamedAtRuleRef({
    idCounter,
    stableId,
    format: CSS_EXTRA_CONFIG.namedRuleFormat.property,
    value: descriptors,
    buildCss: buildPropertyCss,
  });
}
