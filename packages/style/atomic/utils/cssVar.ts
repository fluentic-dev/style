export function getCssVar(varName: string, value: string) {
  return 'var(' + varName + ', ' + escapeCssValue(value) + ')';
}

export function getCssVarRawFallback(varName: string, fallbackCss: string) {
  return 'var(' + varName + ', ' + fallbackCss + ')';
}

export function escapeCssValue(value: string): string {
  if (!value) return '';

  return value
    .trim()
    // Escape existing backslashes first so we don't break them.
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/;/g, '\\;');
}
