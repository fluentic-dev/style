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

export function escapeCssIdent(ident: string): string {
  let result = '';

  for (let i = 0; i < ident.length; i++) {
    const char = ident.charAt(i);
    const code = ident.charCodeAt(i);
    const nextCode = ident.charCodeAt(i + 1);

    if (code === 0) {
      result += '\uFFFD';
      continue;
    }

    if (
      (code >= 1 && code <= 31) ||
      code === 127 ||
      (i === 0 && code >= 48 && code <= 57) ||
      (i === 1 && code >= 48 && code <= 57 && ident.charCodeAt(0) === 45)
    ) {
      result += '\\' + code.toString(16) + ' ';
      continue;
    }

    if (i === 0 && code === 45 && ident.length === 1) {
      result += '\\-';
      continue;
    }

    if (code >= 0xD800 && code <= 0xDBFF && nextCode >= 0xDC00 && nextCode <= 0xDFFF) {
      result += char + ident.charAt(++i);
      continue;
    }

    if (
      code >= 128 ||
      code === 45 ||
      code === 95 ||
      (code >= 48 && code <= 57) ||
      (code >= 65 && code <= 90) ||
      (code >= 97 && code <= 122)
    ) {
      result += char;
      continue;
    }

    result += '\\' + char;
  }

  return result;
}

export function sanitizeCssIdentName(value: string, fallback: string = '') {
  return value.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || fallback;
}
