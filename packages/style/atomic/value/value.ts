import { UnitlessProperties } from './unitless';

const CSS_NUMBER_VALUE = /^-?(\d+\.?\d*|\.\d+)$/;

const UNITLESS = new Set(UnitlessProperties);

export function getCssPropertyValue(property: string, value: string): string {
  if (!value || UNITLESS.has(property)) return value;

  if (CSS_NUMBER_VALUE.test(value)) return value + 'px';

  return value;
}
