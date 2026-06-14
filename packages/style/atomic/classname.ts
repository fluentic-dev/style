import type { BuilderCallsite, ItemSelector } from '../builder/data';
import { hashString } from '../utils/hash';
import { getDebugPropertyName } from './debug/classname';
import { getDebugAtRuleName, getDebugSelectorName } from './debug/selector';
import { getIdentifierSafeHash } from './utils/css';
import { getSelectorHash, getSelectorText } from './utils/selector';

export function getAtomicClassName(
  property: string,
  priority: number | null,
  value: string,
  selector: ItemSelector | null,
  parentSelector: ItemSelector | null,
  atRule: ItemSelector[] | null,
  callsite: BuilderCallsite | null,
  classNamePrefix: string,
  localClassName: boolean,
  debugClassName: boolean,
  debugPropertyLength: number,
  debugValueLength: number,
  debugSelectorLength: number,
  debugParentSelectorLength: number,
  debugAtRuleLength: number,
) {
  let text: string | null;
  let hash = property;

  hash += '\n' + (priority || '');
  hash += '\n' + value;
  hash += '\n' + (selector ? getSelectorHash(selector) : '');
  hash += '\n' + (parentSelector ? getSelectorHash(parentSelector) : '');
  hash += '\n' + (atRule ? atRule.map(getSelectorHash).join('\n') : '');
  hash += '\n' + getCallsiteHash(callsite, localClassName);

  hash = hashString(hash);

  let className: string;

  if (debugClassName) {
    const propertyName = getDebugPropertyName(
      property,
      value,
      debugPropertyLength,
      debugValueLength,
    );

    className = propertyName?.property || property;

    if (selector && debugSelectorLength) {
      text = getDebugSelectorName(getSelectorText(selector), debugSelectorLength);

      if (text) className = className + '-' + text;
    }

    if (parentSelector && debugParentSelectorLength) {
      text = getDebugSelectorName(getSelectorText(parentSelector), debugParentSelectorLength);

      if (text) className = text + '-' + className;
    }

    if (atRule && debugAtRuleLength) {
      text = getDebugAtRuleName(
        atRule.map(getSelectorText),
        debugAtRuleLength,
      );

      if (text) className = text + '-' + className;
    }

    if (value && debugValueLength && propertyName) {
      text = propertyName.value || propertyName.arbitraryValue;

      if (text) className = className + '-' + text;
    }

    className += '-' + hash;
  } else {
    className = getIdentifierSafeHash(hash);
  }

  return classNamePrefix + className;
}

export function getClassNameDedupe(
  property: string,
  priority: number | null,
  selector: ItemSelector | null,
  parentSelector: ItemSelector | null,
  atRule: ItemSelector[] | null,
) {
  let hash = property;

  hash += '\n' + (priority || '');
  hash += '\n' + (selector ? getSelectorHash(selector) : '');
  hash += '\n' + (parentSelector ? getSelectorHash(parentSelector) : '');
  hash += '\n' + (atRule ? atRule.map(getSelectorHash).join('\n') : '');

  return hashString(hash);
}

function getCallsiteHash(
  callsite: BuilderCallsite | null,
  localClassName: boolean,
) {
  if (!localClassName || !callsite) return '';

  return callsite.filePath + '\n' + callsite.line + ':' + callsite.column;
}
