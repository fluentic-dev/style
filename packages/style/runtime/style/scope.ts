import type { ScopeTargetData, SlotData } from '../../builder/data/data';
import { isScopeData } from '../../builder/data/is';
import type { StyleTheme } from '../types';

export function combineScope(...scopes: (StyleTheme | undefined)[]) {
  return (target: SlotData) => resolveScopeTargets(target, scopes);
}

export function bindScope(
  target: SlotData,
  ...scopes: (StyleTheme | undefined)[]
) {
  return resolveScopeTargets(target, scopes);
}

function resolveScopeTargets(
  target: SlotData,
  scopes: (StyleTheme | undefined)[],
): ScopeTargetData[] {
  const targets: ScopeTargetData[] = [];
  const stack: StyleTheme[] = scopes.slice();

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
