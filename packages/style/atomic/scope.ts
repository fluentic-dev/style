import { RUNTIME_CONFIG } from '../config';

export function getScopeParentClassName(
  className: string,
  scopeTargetPrefix: string = RUNTIME_CONFIG.scopeTargetPrefix,
) {
  return scopeTargetPrefix + className;
}
