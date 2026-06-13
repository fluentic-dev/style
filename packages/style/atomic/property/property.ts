import { DefaultPropertyTypes } from './presets';

export const PROPERTY_DEFAULT_PRIORITY = 0;

export function getPropertyPriority(property: string) {
  return DefaultPropertyTypes[property] ?? PROPERTY_DEFAULT_PRIORITY;
}

export function getCssPropertyName(property: string): string {
  return property
    .replace(/^(webkit|moz|ms|o)([A-Z])/g, (_, prefix, c) => `-${prefix}-${c.toLowerCase()}`)
    .replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
}
