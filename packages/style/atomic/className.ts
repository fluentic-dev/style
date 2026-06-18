import type { BuilderCallsite, ItemSelector } from '../builder/data';
import type { ClassNameFormat, ScopeClassNameFormat } from '../config/types';
import { hashString } from '../utils/hash';
import { getDebugClassName, getDebugScopeClassName } from './debug/className';
import { getDebugPropertyName } from './debug/property';
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
  localClassName: boolean,
  debugClassName: boolean,
  classNameFormat: ClassNameFormat | null,
) {
  let hash = property;

  hash += '\n' + (priority || '');
  hash += '\n' + value;
  hash += '\n' + (selector ? getSelectorHash(selector) : '');
  hash += '\n' + (parentSelector ? getSelectorHash(parentSelector) : '');
  hash += '\n' + (atRule ? atRule.map(getSelectorHash).join('\n') : '');
  hash += '\n' + getCallsiteHash(callsite, localClassName);

  hash = getIdentifierSafeHash(hash);

  if (!debugClassName) return hash;

  const propertyName = getDebugPropertyName(property, value);

  const className = getDebugClassName(
    classNameFormat,
    hash,
    {
      atRule: atRule
        ? getDebugAtRuleName(atRule.map(getSelectorText))
        : null,
      scopeSelector: parentSelector
        ? getDebugSelectorName(getSelectorText(parentSelector))
        : null,
      selector: selector
        ? getDebugSelectorName(getSelectorText(selector))
        : null,
      property: propertyName
        ? propertyName.property
        : property,
      value: propertyName
        ? propertyName.value ?? propertyName.arbitraryValue
        : null,
    },
  );

  return className;
}

export function getScopeClassName(
  className: string,
  scopeClassNameFormat: ScopeClassNameFormat | null,
) {
  return getDebugScopeClassName(scopeClassNameFormat, { className });
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
