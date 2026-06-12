import { DefaultPropertyTypes } from './presets';

export const PROPERTY_DEFAULT_PRIORITY = 0;

export function getPropertyPriority(property: string) {
  return DefaultPropertyTypes[property] ?? PROPERTY_DEFAULT_PRIORITY;
}
