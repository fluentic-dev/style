import type { ItemSelector } from '../builder/data/state';
import { RUNTIME_CONFIG } from '../config';
import { LayerGroups, type LayerPriority, LayerPropertyPriorities } from './layer';
import { DefaultPropertyTypes } from './property/presets';
import { getScopeParentClassName } from './scope';
import { escapeCssIdent } from './utils';

const UNITLESS: ReadonlySet<string> = new Set([
  'animationIterationCount',
  'aspectRatio',
  'borderImageOutset',
  'borderImageSlice',
  'borderImageWidth',
  'boxFlex',
  'boxFlexGroup',
  'boxOrdinalGroup',
  'columnCount',
  'columns',
  'fillOpacity',
  'flex',
  'flexGrow',
  'flexNegative',
  'flexOrder',
  'flexPositive',
  'flexShrink',
  'floodOpacity',
  'fontWeight',
  'gridArea',
  'gridColumn',
  'gridColumnEnd',
  'gridColumnSpan',
  'gridColumnStart',
  'gridRow',
  'gridRowEnd',
  'gridRowSpan',
  'gridRowStart',
  'imageOrientation',
  'lineClamp',
  'lineHeight',
  'opacity',
  'order',
  'orphans',
  'scale',
  'stopOpacity',
  'strokeDasharray',
  'strokeDashoffset',
  'strokeMiterlimit',
  'strokeOpacity',
  'strokeWidth',
  'tabSize',
  'widows',
  'zIndex',
  'zoom',
]);

export function camelToKebab(s: string): string {
  // Handle vendor prefixes: WebkitFoo -> -webkit-foo, MozFoo -> -moz-foo
  return s
    .replace(/^(webkit|moz|ms|o)([A-Z])/g, (_, prefix, c) => `-${prefix}-${c.toLowerCase()}`)
    .replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
}

export function formatCssValue(property: string, value: string): string {
  if (!value || UNITLESS.has(property)) return value;
  // Add px to unitless integer/decimal values for length properties
  if (/^-?(\d+\.?\d*|\.\d+)$/.test(value)) return value + 'px';
  return value;
}

export function getSelectorText(selector: ItemSelector): string {
  return Array.isArray(selector) ? selector[0] : selector;
}

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
  const cssProp = camelToKebab(property);
  const cssValue = formatCssValue(property, value);
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
    DefaultPropertyTypes[property] ?? LayerPropertyPriorities.longhand,
  ];
}

function getSelectorPriority(selector: ItemSelector | null): number {
  if (!selector) return 0;
  return Array.isArray(selector) ? selector[1] : 0;
}
