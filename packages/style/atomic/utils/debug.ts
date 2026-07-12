import { sanitizeCssIdentName } from './cssIdent';

export function normalizeDebugKeywordValue(value: string) {
  const normalized = value.trim().toLowerCase();
  return /^[a-z][a-z0-9-]*$/.test(normalized) ? normalized : null;
}

export function sanitizeDebugName(value: string | undefined) {
  if (!value) return '';

  const normalized = value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();

  return sanitizeCssIdentName(normalized, '');
}

export function normalizePropertyName(property: string) {
  return property
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase();
}

export function sanitizeDebugPropertyName(property: string) {
  let name = property;

  if (name.charCodeAt(0) === 45 && name.charCodeAt(1) === 45) {
    name = name.slice(2);
  }

  return name
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/[-_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
