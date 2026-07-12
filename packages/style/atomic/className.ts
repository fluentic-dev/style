import type { BuilderCallsite, ItemSelector } from '../builder/data';
import { CSS_CONFIG } from '../config/config/css';
import { DEV_CONFIG } from '../config/config/dev';
import type { ClassNameFormat, TransformClassNameFormat } from '../config/types';
import { hashString } from '../utils/hash';
import { getDebugClassName, getDebugTransformClassName } from './debug/className';
import { getDebugPropertyName } from './debug/property';
import { getDebugAtRuleName, getDebugSelectorName } from './debug/selector';
export { getScopeClassName } from './scope';
import { getIdentifierSafeHash } from './utils/hash';
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
  transformClassName: string | null,
  transformClassNameFormat: TransformClassNameFormat | null,
  hashLength: number | null = null,
) {
  let hash = property;

  hash += '\n' + (priority || '');
  hash += '\n' + value;
  hash += '\n' + (selector ? getSelectorHash(selector) : '');
  hash += '\n' + (parentSelector ? getSelectorHash(parentSelector) : '');
  hash += '\n' + (atRule ? atRule.map(getSelectorHash).join('\n') : '');
  hash += '\n' + getCallsiteHash(callsite, localClassName);

  hash = getIdentifierSafeHash(
    hash,
    hashLength ?? getRuntimeClassNameHashLength(debugClassName),
  );

  if (!debugClassName) return hash;

  if (transformClassName) {
    return getDebugTransformClassName(
      transformClassNameFormat,
      hash,
      { className: transformClassName },
    );
  }

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

function getRuntimeClassNameHashLength(debugClassName: boolean) {
  if (debugClassName && DEV_CONFIG.isDev) return DEV_CONFIG.hashLength ?? CSS_CONFIG.hashLength ?? 3;
  return CSS_CONFIG.hashLength ?? 7;
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
