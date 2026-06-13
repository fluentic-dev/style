import type { ItemSelector } from '../builder/data/state';
import { RUNTIME_CONFIG } from '../config';
import { LayerGroups, type LayerPriority } from './layer';
import { getCssPropertyName, getPropertyPriority } from './property';
import { getScopeParentClassName } from './scope';
import { escapeCssIdent } from './utils/css';
import { getSelectorPriority, getSelectorText } from './utils/selector';
import { getCssPropertyValue } from './value';

/** Build a single atomic CSS rule text. */
export function buildAtomicRule(
  className: string,
  property: string,
  value: string,
  selector: ItemSelector | null,
  parentSelector: ItemSelector | null,
  atRules: ItemSelector[] | null,
  scopeTargetPrefix: string = RUNTIME_CONFIG.scopeTargetPrefix,
): string {
  const cssProp = getCssPropertyName(property);
  const cssValue = getCssPropertyValue(property, value);
  const escapedClass = escapeCssIdent(className);

  const classSelector = '.' + escapedClass;
  const itemSelector = selector ? getSelectorText(selector) : '';

  let selectorStr = classSelector + itemSelector;

  if (parentSelector) {
    const parentClass = '.' + escapeCssIdent(
      getScopeParentClassName(
        className,
        scopeTargetPrefix,
      ),
    );

    const parent = parentClass + getSelectorText(parentSelector);
    const parentWhere = `:where(${parent})`;

    selectorStr = classSelector + parentWhere + itemSelector + ',' + parentWhere + ' ' + selectorStr;
  }

  let rule = `${selectorStr}{${cssProp}:${cssValue}}`;

  if (atRules) {
    for (let i = atRules.length - 1; i >= 0; i--) {
      rule = `${getSelectorText(atRules[i])}{${rule}}`;
    }
  }

  return rule;
}

export function getAtomicRuleLayerPriority(
  property: string,
  priority: number | null,
  selector: ItemSelector | null,
  parentSelector: ItemSelector | null,
  atRules: ItemSelector[] | null,
  isScopeRule: boolean = false,
): LayerPriority {
  const hasAtRules = !!atRules?.length;
  const hasSelector = !!selector || !!parentSelector;

  const group = parentSelector && !selector
    ? LayerGroups.parentSelector
    : hasAtRules
    ? hasSelector ? LayerGroups.mediaSelector : LayerGroups.media
    : hasSelector
    ? LayerGroups.selector
    : LayerGroups.base;

  return [
    priority ?? 0,
    group,
    getSelectorPriority(selector),
    getSelectorPriority(parentSelector),
    hasAtRules ? atRules.length : 0,
    isScopeRule && !parentSelector ? 1 : 0,
    getPropertyPriority(property),
  ];
}
