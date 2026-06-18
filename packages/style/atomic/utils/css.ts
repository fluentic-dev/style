import { hashString } from '../../utils/hash';

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
  const escaped = ident.replace(/([[\]():.#,>+~*=!|^$@])/g, '\\$1');

  if (/^[0-9]/.test(escaped)) {
    return '\\3' + escaped[0] + ' ' + escaped.slice(1);
  }

  if (/^-[0-9]/.test(escaped)) {
    return '-\\3' + escaped[1] + ' ' + escaped.slice(2);
  }

  return escaped;
}

export function sanitizeCssIdentName(value: string, fallback: string = '') {
  return value.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || fallback;
}

export function getIdentifierSafeHash(value: string) {
  const hash = hashString(value);

  const first = hash.charCodeAt(0);

  if (first < 48 || first > 57) return hash;

  return String.fromCharCode(97 + first - 48) + hash.slice(1);
}
