import type { ItemSelector } from '../builder/data/state';
import type { ScopeClassNameFormat } from '../config/types';
import { LayerMediaPriorities, type LayerPriority, LayerSelectorPriorities } from './layer';
import { getCssPropertyName, getPropertyPriority } from './property';
import { getScopeClassName } from './scope';
import { escapeCssIdent } from './utils/cssIdent';
import { getSelectorPriority, getSelectorText } from './utils/selector';
import { getCssPropertyValue } from './value';

export function buildAtomicRule(
  className: string,
  property: string,
  value: string,
  selector: ItemSelector | null,
  parentSelector: ItemSelector | null,
  atRules: ItemSelector[] | null,
  scopeClassNameFormat: ScopeClassNameFormat | null,
): string {
  const cssProp = getCssPropertyName(property);
  const cssValue = getCssPropertyValue(property, value);
  const escapedClass = escapeCssIdent(className);

  const classSelector = '.' + escapedClass;
  const itemSelector = selector ? getSelectorText(selector) : '';

  let selectorStr = classSelector + itemSelector;

  if (parentSelector) {
    const parentClass = '.' + escapeCssIdent(
      getScopeClassName(className, scopeClassNameFormat),
    );

    const parent = parentClass + getSelectorText(parentSelector);
    const parentWhere = `:where(${parent})`;

    selectorStr = classSelector + parentWhere + itemSelector + ',' + parentWhere + ' ' + selectorStr;
  }

  let rule = `${selectorStr}{${cssProp}: ${cssValue}}`;

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
  const selectorPriority = getSelectorPriority(selector);
  const parentSelectorPriority = getSelectorPriority(parentSelector);
  const atRulePriority = getAtRulePriority(atRules);

  return [
    priority ?? 0,
    getLayerSelectorPriority(selector, parentSelector, selectorPriority),
    getParentSelectorPriority(parentSelector, parentSelectorPriority),
    getMediaPriority(atRules, atRulePriority),
    atRules ? atRules.length : 0,
    isScopeRule && !parentSelector ? 1 : 0,
    getPropertyPriority(property),
  ];
}

function getMediaPriority(
  atRules: ItemSelector[] | null,
  priority: number,
) {
  if (!atRules?.length) return LayerMediaPriorities.base;
  if (priority <= 0) return LayerMediaPriorities.media;
  return LayerMediaPriorities.priorityMedia + priority;
}

function getLayerSelectorPriority(
  selector: ItemSelector | null,
  parentSelector: ItemSelector | null,
  priority: number,
) {
  if (selector) {
    return priority > 0
      ? LayerSelectorPriorities.prioritySelector + priority
      : LayerSelectorPriorities.selector;
  }

  if (parentSelector) return LayerSelectorPriorities.parentSelector;

  return LayerSelectorPriorities.base;
}

function getParentSelectorPriority(
  parentSelector: ItemSelector | null,
  priority: number,
) {
  if (!parentSelector) return 0;
  return priority > 0 ? priority + 1 : 1;
}

function getAtRulePriority(atRules: ItemSelector[] | null) {
  if (!atRules?.length) return 0;

  let priority = 0;

  for (let i = 0, len = atRules.length; i < len; i++) {
    priority = Math.max(priority, getSelectorPriority(atRules[i]));
  }

  return priority;
}
