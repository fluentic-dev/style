import { isScopeData, type ScopeTargetData, type SlotData } from '../../builder/data';
import type { CssTheme } from '../types';

export function scopeCombine(...scopes: (CssTheme | undefined)[]) {
  const shortcut = resolveSingleScopeTarget(scopes);

  if (shortcut !== null) {
    return (target: SlotData) => shortcut(target);
  }

  return (target: SlotData) => resolveScopeTargets(target, scopes);
}

export function scopeTarget(
  target: SlotData,
  ...scopes: (CssTheme | undefined)[]
) {
  const shortcut = resolveSingleScopeTarget(scopes);

  if (shortcut !== null) {
    return shortcut(target);
  }

  return resolveScopeTargets(target, scopes);
}

function resolveSingleScopeTarget(
  scopes: (CssTheme | undefined)[],
): ((target: SlotData) => ScopeTargetData[]) | null {
  if (scopes.length !== 1) return null;

  const scope = scopes[0];
  if (!scope) return () => [];
  if (Array.isArray(scope) || !isScopeData(scope)) return null;

  return (target: SlotData) => [scope(target)];
}

function resolveScopeTargets(
  target: SlotData,
  scopes: (CssTheme | undefined)[],
): ScopeTargetData[] {
  const targets: ScopeTargetData[] = [];
  const stack: CssTheme[] = scopes.slice();

  while (stack.length > 0) {
    const item = stack.pop();

    if (!item) continue;

    if (Array.isArray(item)) {
      for (let i = item.length - 1; i >= 0; i--) {
        stack.push(item[i]);
      }
      continue;
    }

    if (isScopeData(item)) {
      targets.push(item(target));
    }
  }

  return targets;
}
