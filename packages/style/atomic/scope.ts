import type { ScopeClassNameFormat, ScopeClassNameInfo } from '../config/types';

export const SCOPE_CLASS_NAME_FORMAT = '-(className)';

export function getScopeClassName(
  className: string,
  scopeClassNameFormat: ScopeClassNameFormat | null,
) {
  return formatScopeClassName(scopeClassNameFormat || SCOPE_CLASS_NAME_FORMAT, { className });
}

function formatScopeClassName(
  format: ScopeClassNameFormat,
  info: ScopeClassNameInfo,
) {
  if (typeof format === 'function') return format(info);

  return format.replace(/\[|\]/g, '').replace(/\(className\)/g, info.className);
}
