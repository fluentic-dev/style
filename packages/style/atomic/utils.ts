export function getCssVar(varName: string, value: string) {
  return 'var(' + varName + ', ' + escapeCssValue(value) + ')';
}

export function escapeCssValue(value: string): string {
  if (!value) return '';

  return value
    .trim()
    // 1. Escape existing backslashes first so we don't break them
    .replace(/\\/g, '\\\\')
    // 2. Escape double/single quotes to prevent breaking out of string contexts (e.g., urls, content)
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    // 3. Escape semicolons so someone can't inject a new CSS rule mid-value
    .replace(/;/g, '\\;')
    // 4. Escape parentheses so they don't prematurely close a var() or url() wrapper
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
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
