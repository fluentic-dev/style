export function normalizeRule(rule: string | { css: string; }) {
  return typeof rule === 'string' ? rule : rule.css;
}
