export type DebugValueName = {
  value: string | null;
  arbitraryValue: string | null;
};

export function getDebugValueName(
  value: string,
): DebugValueName {
  if (!value) {
    return { value: null, arbitraryValue: null };
  }

  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return { value: null, arbitraryValue: null };
  }

  if (
    normalized.startsWith('url') ||
    normalized.includes('gradient') ||
    normalized.startsWith('image') ||
    normalized.startsWith('calc(') ||
    normalized.startsWith('var(') ||
    normalized.startsWith('env(') ||
    normalized.startsWith('rgb') ||
    normalized.startsWith('hsl')
  ) {
    return { value: null, arbitraryValue: null };
  }

  if (/^[a-z][a-z0-9-]*$/.test(normalized)) {
    return { value: normalized, arbitraryValue: null };
  }

  const name = normalized
    .replace(/px/g, '')
    .replace(/rem/g, 'rem')
    .replace(/em/g, 'em')
    .replace(/%/g, 'pct')
    .replace(/fr/g, 'fr')
    .replace(/[,()"'#]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._%-]+/g, '-')
    .replace(/[-_]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!name) {
    return { value: null, arbitraryValue: null };
  }

  return { value: null, arbitraryValue: name };
}
